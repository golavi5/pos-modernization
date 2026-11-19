import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FiscalProfile } from '../../fiscal-profile/entities/fiscal-profile.entity';
import { loadKek, open, seal } from '../../custody/envelope';
import { PLEMSI_BASE_URL, PlemsiEnvironment } from './plemsi.constants';
import { PlemsiAdapter } from './plemsi.adapter';
import { PlemsiConfig } from './plemsi-config.entity';

export interface EmissionSettings {
  enabled: boolean;
  pos_prefix?: string;
  pos_resolution?: string;
  invoice_prefix?: string;
  invoice_resolution?: string;
  credit_note_prefix?: string;
  credit_note_resolution?: string;
}

const NUMBERING = ['pos_prefix', 'pos_resolution', 'invoice_prefix', 'invoice_resolution', 'credit_note_prefix', 'credit_note_resolution'] as const;
const pick = (row: PlemsiConfig) => ({ enabled: row.emission_enabled, ...Object.fromEntries(NUMBERING.map((k) => [k, row[k]])) }) as EmissionSettings;
const definedOnly = (dto: EmissionSettings) => Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined)) as Partial<EmissionSettings>;

@Injectable()
export class PlemsiConfigService {
  constructor(
    @InjectRepository(PlemsiConfig) private readonly repo: Repository<PlemsiConfig>,
    @InjectRepository(FiscalProfile) private readonly profiles: Repository<FiscalProfile>,
  ) {}

  async set(companyId: string, environment: PlemsiEnvironment, token: string): Promise<void> {
    const { wrappedKey, ciphertext } = seal(loadKek(), companyId, token);
    await this.repo.upsert(
      { company_id: companyId, environment, wrapped_data_key: wrappedKey, token_encrypted: ciphertext },
      ['company_id'],
    );
  }

  /** Never returns the token. */
  async describe(companyId: string) {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    const { environment, updated_at, emission_enabled, ...rest } = row;
    const { id: _id, company_id: _c, wrapped_data_key: _w, token_encrypted: _t, created_at: _ca, ...numbering } = rest;
    return { environment, updated_at, emission_enabled, ...numbering };
  }

  /** Turning emission on needs everything the worker will need, so a document never queues into a row that cannot be sent. */
  async configureEmission(companyId: string, dto: EmissionSettings): Promise<void> {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    const next = { ...pick(row), ...definedOnly(dto) };
    if (next.enabled) {
      const complete = (p: string | null | undefined, r: string | null | undefined) => !!p && !!r;
      if (!complete(next.pos_prefix, next.pos_resolution) && !complete(next.invoice_prefix, next.invoice_resolution)) {
        throw new BadRequestException('Configure numbering (prefix and resolution) for at least one document type to enable emission');
      }
      if (!(await this.profiles.existsBy({ company_id: companyId }))) throw new BadRequestException('Set the fiscal profile first');
    }
    const { enabled, ...numbering } = next;
    await this.repo.update(row.id, { emission_enabled: enabled, ...numbering });
  }

  /** Decrypts only here, in memory, to build the adapter for one issuer. */
  async adapterFor(companyId: string): Promise<PlemsiAdapter> {
    const row = await this.repo.findOneBy({ company_id: companyId });
    if (!row) throw new NotFoundException('Plemsi is not configured for this issuer');
    const token = open(loadKek(), companyId, { wrappedKey: row.wrapped_data_key, ciphertext: row.token_encrypted });
    return new PlemsiAdapter({ baseUrl: PLEMSI_BASE_URL[row.environment as PlemsiEnvironment], token });
  }
}
