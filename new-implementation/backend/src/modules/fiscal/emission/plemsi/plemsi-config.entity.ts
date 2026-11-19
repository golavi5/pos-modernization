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

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;
}
