import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Order } from './order.entity';

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
  OTHER = 'other'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'order_id' })
  order_id: number;

  @Column({ 
    type: 'enum', 
    enum: PaymentMethod,
    name: 'payment_method'
  })
  payment_method: PaymentMethod;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'timestamp', name: 'payment_date', default: () => 'CURRENT_TIMESTAMP' })
  payment_date: Date;

  @Column({ type: 'varchar', name: 'transaction_id', nullable: true })
  transaction_id?: string;

  @Column({ 
    type: 'enum', 
    enum: PaymentStatus,
    default: PaymentStatus.COMPLETED
  })
  status: PaymentStatus;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Order, order => order.payments)
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: Order;
}