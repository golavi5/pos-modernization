import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column('varchar', { length: 128, unique: true })
  name: string;

  @Column('text')
  description: string;

  @Column('char', { length: 36, nullable: true })
  company_id: string;

  @Column('boolean', { default: false })
  is_system_role: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('datetime', { nullable: true })
  deleted_at: Date;

  // Many-to-many relationship with users
  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }
}
