import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentStatus, EmissionPort, EmitResult, PosDocument } from '../emission/emission.types';
import { PlemsiConfig } from '../emission/plemsi/plemsi-config.entity';
import { PlemsiConfigService } from '../emission/plemsi/plemsi-config.service';
import { FiscalProfile } from '../fiscal-profile/entities/fiscal-profile.entity';
import { EmissionOutbox } from './outbox.entity';

const TICK_MS = 5_000;
const BATCH = 10;
const LEASE_MS = 2 * 60_000;
const BASE_BACKOFF_MS = 15_000;
const MAX_BACKOFF_MS = 60 * 60_000;
const MAX_ATTEMPTS = 12;
const SOFTWARE_NAME = 'Plemsi'; // VERIFY: softwareManufacturer.softwareName, as sent by ApiFacturame

export const backoffMs = (attempts: number): number => Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);

/**
 * Drains `fiscal_emission_outbox` (SPEC-FISC-003 T-05). Rows are claimed with
 * `FOR UPDATE SKIP LOCKED` and a short lease, so a crashed worker's rows come back.
 * Numbers are assigned and stored BEFORE the first send, so a retry carries the
 * same number, and a retried row asks the provider whether it already has the
 * document before emitting again. A `sent` row is only polled, never re-emitted.
 * Single instance assumed (Coolify); the unique (company, prefix, number) index
 * makes a numbering race fail loudly instead of silently duplicating.
 */
@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(OutboxWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly ds: DataSource,
    private readonly configs: PlemsiConfigService,
    @InjectRepository(EmissionOutbox) private readonly outbox: Repository<EmissionOutbox>,
    @InjectRepository(PlemsiConfig) private readonly cfgRepo: Repository<PlemsiConfig>,
    @InjectRepository(FiscalProfile) private readonly profiles: Repository<FiscalProfile>,
  ) {}

  onApplicationBootstrap() {
    // Tests drive `tick()` by hand.
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), TICK_MS);
    this.timer.unref();
  }

  onApplicationShutdown() {
    clearInterval(this.timer);
  }

  async tick(now: Date = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.claim(now);
      const adapters = new Map<string, EmissionPort>();
      for (const row of rows) {
        try {
          let adapter = adapters.get(row.company_id);
          if (!adapter) adapters.set(row.company_id, (adapter = await this.configs.adapterFor(row.company_id)));
          await this.process(row, adapter, now);
        } catch (e) {
          await this.fail(row, e, now);
        }
      }
    } catch (e) {
      this.logger.error(`tick failed: ${(e as Error).name}`);
    } finally {
      this.running = false;
    }
  }

  private claim(now: Date): Promise<EmissionOutbox[]> {
    return this.ds.transaction(async (m) => {
      const rows = await m
        .createQueryBuilder(EmissionOutbox, 'o')
        .where('o.status IN (:...s) AND o.next_attempt_at <= :now', { s: ['pending', 'sent'], now })
        .orderBy('o.created_at', 'ASC')
        .limit(BATCH)
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .getMany();
      if (rows.length) {
        const lease = new Date(now.getTime() + LEASE_MS);
        await m.update(EmissionOutbox, rows.map((r) => r.id), { next_attempt_at: lease });
      }
      return rows;
    });
  }

  private async process(row: EmissionOutbox, adapter: EmissionPort, now: Date): Promise<void> {
    if (row.status === 'sent') {
      const st = await adapter.getStatus('pos', row.prefix!, row.number!);
      return this.applyStatus(row, st, now);
    }
    const cfg = await this.cfgRepo.findOneByOrFail({ company_id: row.company_id });
    const profile = await this.profiles.findOneBy({ company_id: row.company_id });
    if (!profile || !cfg.pos_prefix || !cfg.pos_resolution || !row.draft) {
      return this.terminal(row, 'failed', 'Missing fiscal profile, POS numbering or document data');
    }
    if (row.number === null) {
      const last = await this.outbox
        .createQueryBuilder('o')
        .select('MAX(o.number)', 'n')
        .where('o.company_id = :c AND o.prefix = :p', { c: row.company_id, p: cfg.pos_prefix })
        .getRawOne<{ n: number | null }>();
      const provider = await adapter.nextNumber(cfg.pos_resolution, cfg.pos_prefix);
      row.prefix = cfg.pos_prefix;
      row.resolution = cfg.pos_resolution;
      row.number = Math.max(provider, (last?.n ?? 0) + 1);
      await this.outbox.update(row.id, { prefix: row.prefix, resolution: row.resolution, number: row.number });
    }
    if (row.attempts > 0) {
      // An earlier attempt may have reached the provider before failing on our side.
      const known = await adapter.getStatus('pos', row.prefix!, row.number);
      if (known) return this.applyStatus(row, known, now);
    }
    const doc: PosDocument = {
      type: 'pos',
      prefix: row.prefix!,
      number: row.number,
      resolution: row.resolution!,
      ...row.draft,
      softwareManufacturer: { ownerName: profile.legal_name, softwareName: SOFTWARE_NAME, companyName: profile.legal_name },
    };
    return this.applyEmit(row, await adapter.emit(doc), now);
  }

  private async applyEmit(row: EmissionOutbox, r: EmitResult, now: Date): Promise<void> {
    if (r.outcome === 'payload_rejected') return this.terminal(row, 'rejected', r.reason);
    return this.applyStatus(row, { verdict: r.verdict, cude: r.cude, qr: r.qr, preview: null, reason: r.reason }, now);
  }

  private async applyStatus(row: EmissionOutbox, st: DocumentStatus | null, now: Date): Promise<void> {
    if (!st) return this.retry(row, 'Provider does not know the document yet', now);
    const doc = { cufe: st.cude ?? row.cufe, qr: st.qr ?? row.qr };
    if (st.verdict === 'accepted') return this.terminal(row, 'validated', null, doc);
    if (st.verdict === 'rejected') return this.terminal(row, 'rejected', st.reason ?? 'Rejected by DIAN', doc);
    // Provider took it; DIAN has not answered. Poll, never re-emit.
    await this.outbox.update(row.id, { ...doc, status: 'sent', last_error: null });
    row.status = 'sent';
    return this.retry(row, null, now);
  }

  private async terminal(row: EmissionOutbox, status: 'validated' | 'rejected' | 'failed', error: string | null, extra: Partial<EmissionOutbox> = {}): Promise<void> {
    await this.outbox.update(row.id, { ...extra, status, last_error: error });
  }

  private async retry(row: EmissionOutbox, error: string | null, now: Date): Promise<void> {
    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const why = row.status === 'sent' ? 'DIAN verdict not confirmed; check the provider' : (error ?? 'Gave up after repeated errors');
      return this.terminal(row, 'failed', why);
    }
    await this.outbox.update(row.id, {
      attempts,
      last_error: error,
      next_attempt_at: new Date(now.getTime() + backoffMs(attempts)),
    });
  }

  /** Any error from the provider or from our side. Only the error name is stored for unknown errors: messages could echo payloads. */
  private fail(row: EmissionOutbox, e: unknown, now: Date): Promise<void> {
    const known = (e as { constructor?: { name?: string } })?.constructor?.name;
    const msg = known === 'EmissionTransientError' ? (e as Error).message : `Unexpected error (${(e as Error)?.name ?? 'unknown'})`;
    return this.retry(row, msg, now);
  }
}
