import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('fiscal_idempotency_keys')
@Index('uq_fiscal_idempotency', ['company_id', 'key'], { unique: true })
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  company_id: string;

  @Column({ type: 'varchar', length: 255, name: 'idem_key' })
  key: string;

  @Column({ type: 'char', length: 64 })
  request_hash: string;

  /** null while the first request is still running. */
  @Column({ type: 'int', nullable: true })
  response_status: number | null;

  @Column({ type: 'json', nullable: true })
  response_body: unknown;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
