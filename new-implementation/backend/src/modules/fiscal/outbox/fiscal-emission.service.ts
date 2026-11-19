import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PlemsiConfig } from '../emission/plemsi/plemsi-config.entity';
import { EmissionOutbox } from './outbox.entity';
import { EnqueuePosInput } from './outbox.types';

/**
 * Public interface of the fiscal context for the POS (DESIGN-001 §3): `sales` calls
 * this inside the transaction that closes a sale. Both methods take the caller's
 * `EntityManager` so the outbox row commits or rolls back with the sale.
 */
@Injectable()
export class FiscalEmissionService {
  /** Whether sales of this company close into a POS document. Tenants without fiscal set up pay one indexed read. */
  async isEnabled(manager: EntityManager, companyId: string): Promise<boolean> {
    const cfg = await manager.findOne(PlemsiConfig, { where: { company_id: companyId }, select: ['id', 'emission_enabled'] });
    return cfg?.emission_enabled === true;
  }

  /** Idempotent per order: a second call for the same sale does nothing. */
  async enqueuePos(manager: EntityManager, input: EnqueuePosInput): Promise<void> {
    try {
      await manager.insert(EmissionOutbox, {
        company_id: input.companyId,
        order_id: input.orderId,
        status: input.draft ? 'pending' : 'failed',
        draft: input.draft,
        last_error: input.draft ? null : (input.unsupportedReason ?? 'Sale could not be mapped to a fiscal document'),
        next_attempt_at: new Date(),
      });
    } catch (e) {
      if ((e as { code?: string }).code !== 'ER_DUP_ENTRY') throw e;
    }
  }
}
