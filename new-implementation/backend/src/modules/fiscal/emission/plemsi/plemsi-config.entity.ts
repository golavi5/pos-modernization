import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Per-issuer Plemsi credentials. The token is envelope-encrypted; the host comes from `environment`, never from tenant input. */
@Entity('fiscal_plemsi_config')
export class PlemsiConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, unique: true })
  company_id: string;

  @Column({ type: 'varchar', length: 16 })
  environment: string;

  @Column({ type: 'text' })
  wrapped_data_key: string;

  @Column({ type: 'text' })
  token_encrypted: string;

  /** Sales close into a POS document only while this is true (set through the admin endpoint, which checks the prerequisites). */
  @Column({ type: 'boolean', default: false })
  emission_enabled: boolean;

  @Column({ type: 'varchar', length: 16, nullable: true })
  pos_prefix: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  pos_resolution: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  invoice_prefix: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  invoice_resolution: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  credit_note_prefix: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  credit_note_resolution: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
