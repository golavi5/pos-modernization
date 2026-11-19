import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Fiscal counterparty (ADR-006). Distinct from POS `Customer`; `customer_id` is a loose reference, no FK. */
@Entity('fiscal_third_parties')
@Index('uq_fiscal_third_party_nit', ['company_id', 'nit'], { unique: true })
export class ThirdParty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36 })
  company_id: string;

  @Column({ type: 'varchar', length: 15 })
  nit: string;

  @Column({ type: 'char', length: 1 })
  dv: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'json' })
  responsibility_codes: string[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  notification_email: string | null;

  @Column({ type: 'char', length: 36, nullable: true })
  customer_id: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
