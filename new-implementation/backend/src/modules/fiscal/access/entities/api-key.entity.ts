import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** Per-application credential for /fiscal/v1. Only the SHA-256 of the key is stored. */
@Entity('fiscal_api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  company_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** First characters of the key, for display only. */
  @Column({ type: 'varchar', length: 12 })
  key_prefix: string;

  @Column({ type: 'char', length: 64, unique: true })
  key_hash: string;

  @Column({ type: 'json' })
  scopes: string[];

  @Column({ type: 'datetime', nullable: true })
  revoked_at: Date | null;

  @Column({ type: 'datetime', nullable: true })
  last_used_at: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
