import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../../products/entities/product.entity';
import { numericTransformer } from '../../../common/column-numeric.transformer';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'char', length: 36, name: 'order_id' })
  order_id: string;

  @Column({ type: 'char', length: 36, name: 'product_id' })
  product_id: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'unit_price', transformer: numericTransformer })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  subtotal: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    name: 'tax_amount',
    transformer: numericTransformer,
  })
  tax_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: numericTransformer })
  total: number;

  @ManyToOne(() => Order, (order) => order.order_items)
  @JoinColumn({ name: 'order_id', referencedColumnName: 'id' })
  order: Order;

  @ManyToOne(() => Product, (product) => product.order_items)
  @JoinColumn({ name: 'product_id', referencedColumnName: 'id' })
  product: Product;
}
