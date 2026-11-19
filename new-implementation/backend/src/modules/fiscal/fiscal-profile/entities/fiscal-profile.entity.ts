import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/**
 * Fiscal profile of an issuer. The issuer is always a `company` (SPEC-FISC-002 §3).
 * `regime`, `responsibility_codes` and `habilitation_status` are free-form until
 * the anexo tables are loaded with a cited source (VERIFY) — no invented enum.
 */
@Entity('fiscal_profiles')
export class FiscalProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, unique: true })
  company_id: string;

  @Column({ type: 'varchar', length: 15 })
  nit: string;

  @Column({ type: 'char', length: 1 })
  dv: string;

  @Column({ type: 'varchar', length: 255 })
  legal_name: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  regime: string | null;

  @Column({ type: 'json' })
  responsibility_codes: string[];

  @Column({ type: 'varchar', length: 32, default: 'none' })
  habilitation_status: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
