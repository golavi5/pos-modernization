import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';
import { IsUUID, IsString, IsOptional, ValidateNested } from 'class-validator';

@Entity('product_categories')
export class ProductCategory {
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

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  parent_id?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deleted_at?: Date;
}