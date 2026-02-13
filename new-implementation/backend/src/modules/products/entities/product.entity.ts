import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { IsUUID, IsString, IsNumber, IsBoolean, IsOptional, IsPositive, Min, Max, IsUrl, ValidateNested } from 'class-validator';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id', type: 'uuid' })
  @IsUUID()
  company_id: string;

  @Column({ name: 'name', type: 'varchar', length: 255 })
  @IsString()
  name: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Column({ name: 'sku', type: 'varchar', length: 100, unique: true })
  @IsString()
  sku: string;

  @Column({ name: 'barcode', type: 'varchar', length: 100, nullable: true, unique: true })
  @IsOptional()
  @IsString()
  barcode?: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @Column({ name: 'price', type: 'decimal', precision: 10, scale: 2 })
  @IsNumber()
  @Min(0)
  price: number;

  @Column({ name: 'cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  stock_quantity: number;

  @Column({ name: 'reorder_level', type: 'int', default: 0 })
  @IsNumber()
  @Min(0)
  reorder_level: number;

  @Column({ name: 'tax_rate', type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  tax_rate: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @IsBoolean()
  is_active: boolean;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  @IsOptional()
  @IsUrl()
  image_url?: string;

  @Column({ name: 'created_by', type: 'uuid' })
  @IsUUID()
  created_by: string;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at?: Date;
}