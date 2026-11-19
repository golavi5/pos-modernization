import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { toView } from '../documents/documents.service';
import { EmissionOutbox } from '../outbox/outbox.entity';

/** A row still pending/sent this long after creation, or retried this many times, is "stuck". */
export const STUCK_AFTER_MS = 30 * 60_000;
export const STUCK_AFTER_ATTEMPTS = 3;

export type ReceiptStatus =
  | { status: 'not_applicable' }
  | { status: 'pending' | 'attention' }
  | { status: 'validated'; prefix: string | null; number: number | null; cufe: string | null; qr: string | null };

@Injectable()
export class ReconciliationService {
  constructor(@InjectRepository(EmissionOutbox) private readonly outbox: Repository<EmissionOutbox>) {}

  /** Documents that need a person: failed, rejected, or stuck in flight. Newest first. */
  async problems(companyId: string, limit = 100, now: Date = new Date()) {
    const stuckBefore = new Date(now.getTime() - STUCK_AFTER_MS);
    const rows = await this.outbox
      .createQueryBuilder('o')
      .where('o.company_id = :companyId', { companyId })
      .andWhere(
        new Brackets((q) =>
          q
            .where('o.status IN (:...bad)', { bad: ['failed', 'rejected'] })
            .orWhere(
              new Brackets((s) =>
                s
                  .where('o.status IN (:...open)', { open: ['pending', 'sent'] })
                  .andWhere('(o.created_at < :stuckBefore OR o.attempts >= :attempts)', { stuckBefore, attempts: STUCK_AFTER_ATTEMPTS }),
              ),
            ),
        ),
      )
      .orderBy('o.created_at', 'DESC')
      .limit(limit)
      .getMany();
    return rows.map((r) => ({
      ...toView(r),
      order_id: r.order_id,
      attempts: r.attempts,
      next_attempt_at: r.next_attempt_at,
      kind: r.status === 'pending' || r.status === 'sent' ? 'stuck' : r.status,
    }));
  }

  /** Only `failed` rows (a configuration or data problem that someone has since fixed) go back to the queue. */
  async requeue(companyId: string, id: string): Promise<void> {
    const row = await this.outbox.findOneBy({ id, company_id: companyId });
    if (!row) throw new NotFoundException('Document not found');
    if (row.status !== 'failed') throw new ConflictException('Only failed documents can be requeued');
    await this.outbox.update(row.id, { status: 'pending', attempts: 0, last_error: null, next_attempt_at: new Date() });
  }

  /** What a cashier's receipt shows for a sale. No row = fiscal is not in use for this sale. */
  async forSale(companyId: string, orderId: string): Promise<ReceiptStatus> {
    const row = await this.outbox.findOneBy({ company_id: companyId, order_id: orderId });
    if (!row) return { status: 'not_applicable' };
    if (row.status === 'validated') return { status: 'validated', prefix: row.prefix, number: row.number, cufe: row.cufe, qr: row.qr };
    return { status: row.status === 'pending' || row.status === 'sent' ? 'pending' : 'attention' };
  }
}
