import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Warehouse } from './warehouse.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('warehouse_locations')
export class WarehouseLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string = uuid();

  @Column('uuid')
  company_id: string;

  @Column('uuid')
  warehouse_id: string;

  @ManyToOne(() => Warehouse, (warehouse) => warehouse.locations)
  warehouse: Warehouse;

  @Column()
  location_code: string;

  @Column()
  capacity: number;

  @Column({ default: 0 })
  current_stock: number;

  @OneToMany(() => StockMovement, (movement) => movement.location)
  movements: StockMovement[];

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  deleted_at: Date;
}
