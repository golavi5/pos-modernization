import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../common/column-numeric.transformer';
import { OutboxDocumentType } from '../outbox/outbox.types';

/**
 * Sales book (libro de ventas): one row per document the provider reported as
 * validated by DIAN, written in the same transaction that marks it validated
 * (SPEC-FISC-003 T-09). Figures come from the document's own lines; no tax rule is
 * applied here and nothing is grouped by tax period (SPEC-FISC-007).
 */
@Entity('fiscal_ledger_sales')
@Index('idx_fiscal_ledger_company_date', ['company_id', 'issued_at'])
export class LedgerSale {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  company_id: string;

  /** The outbox row this entry was derived from; makes recording idempotent. */
  @Column({ type: 'char', length: 36, unique: true })
  outbox_id: string;

  @Column({ type: 'varchar', length: 16 })
  document_type: OutboxDocumentType;

  @Column({ type: 'varchar', length: 16 })
  prefix: string;

  @Column({ type: 'int' })
  number: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  cufe: string | null;

  /** Transmission moment (UTC). VERIFY: the date DIAN holds is the one stamped at send. */
  @Column({ type: 'datetime', precision: 6 })
  issued_at: Date;

  /**
   * Calendar date in Colombia (UTC-5) of `issued_at`, `YYYY-MM-DD`; what a date filter
   * compares against. Text on purpose: a DATE column is read back as a local-midnight
   * Date and shifts a day on a non-UTC host.
   */
  @Column({ type: 'char', length: 10 })
  issue_date: string;

  /** Null = final consumer. */
  @Column({ type: 'varchar', length: 20, nullable: true })
  buyer_identification: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  buyer_name: string | null;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  base_total: number;

  /** IVA plus any other tax in the document (e.g. bag tax). */
  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  tax_total: number;

  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  total: number;

  /** The document's own tax totals (`allTaxTotals`), one per rate. */
  @Column({ type: 'json' })
  tax_breakdown: unknown;

  /** -1 for credit notes, so sums net them out. */
  @Column({ type: 'tinyint' })
  sign: number;

  @CreateDateColumn({ name: 'created_at', precision: 6 })
  created_at: Date;
}
