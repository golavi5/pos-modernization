import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { numericTransformer } from '../../common/column-numeric.transformer';

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

  // MySQL devuelve DECIMAL como string. Sin este transformer,
  // `customer.loyalty_points += points` daba `"100.00" + 50 = "100.0050"`, y el
  // `reduce` de `getStats` concatenaba en vez de sumar (`avgPurchaseValue`
  // salía NaN → `null` en el JSON). Los unit tests no lo veían porque mockean
  // el repositorio con números.
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, transformer: numericTransformer })
  loyalty_points: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0, transformer: numericTransformer })
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
