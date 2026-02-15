import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { WarehouseLocation } from './warehouse-location.entity';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUST = 'ADJUST',
  DAMAGE = 'DAMAGE',
  RETURN = 'RETURN',
}

@Entity('stock_movements')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuid();

  @Column('uuid')
  company_id: string;

  @Column('uuid')
  product_id: string;

  @Column('uuid')
  location_id: string;

  @ManyToOne(() => WarehouseLocation, (location) => location.movements)
  location: WarehouseLocation;

  @Column({
    type: 'enum',
    enum: MovementType,
  })
  movement_type: MovementType;

  @Column()
  quantity: number;

  @Column({ nullable: true })
  reference_id: string;

  @Column({ nullable: true })
  notes: string;

  @Column('uuid')
  created_by: string;

  @CreateDateColumn()
  created_at: Date;
}
