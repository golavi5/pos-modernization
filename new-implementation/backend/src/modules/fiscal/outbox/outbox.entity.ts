import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OutboxDocumentType, OutboxDraft, OutboxStatus } from './outbox.types';

/** Transactional outbox: inserted in the same transaction that closes the sale (SPEC-FISC-003 T-04). */
@Entity('fiscal_emission_outbox')
@Index('uq_fiscal_outbox_number', ['company_id', 'prefix', 'number'], { unique: true })
@Index('idx_fiscal_outbox_due', ['status', 'next_attempt_at'])
export class EmissionOutbox {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  company_id: string;

  /** One document per sale, however many times the payment is recorded. Null for documents emitted through the API (MySQL allows many NULLs in a unique index). */
  @Column({ type: 'char', length: 36, unique: true, nullable: true })
  order_id: string | null;

  @Column({ type: 'varchar', length: 16, default: 'pos' })
  document_type: OutboxDocumentType;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: OutboxStatus;

  @Column({ type: 'json', nullable: true })
  draft: OutboxDraft | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  prefix: string | null;

  @Column({ type: 'int', nullable: true })
  number: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  resolution: string | null;

  /** The moment stamped on the document when it was sent. */
  @Column({ type: 'datetime', precision: 6, nullable: true })
  issued_at: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  cufe: string | null;

  @Column({ type: 'text', nullable: true })
  qr: string | null;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ type: 'datetime', precision: 6 })
  next_attempt_at: Date;

  @Column({ type: 'text', nullable: true })
  last_error: string | null;

  @CreateDateColumn({ name: 'created_at', precision: 6 })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', precision: 6 })
  updated_at: Date;
}
