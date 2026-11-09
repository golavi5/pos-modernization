import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
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

  // Joins on the real `location_id`. Without @JoinColumn TypeORM invented a second
  // `locationId` column (always NULL) and put the FK on it. No DB FK here on purpose:
  // adding one in a boot-time migration could fail on existing rows.
  @ManyToOne(() => WarehouseLocation, (location) => location.movements, {
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'location_id' })
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
