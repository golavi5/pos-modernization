import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuid } from 'uuid';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuid();

  @Column('uuid')
  company_id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  loyalty_points: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  total_purchases: number;

  @Column({ type: 'timestamp', nullable: true })
  last_purchase_date: Date;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;
}
