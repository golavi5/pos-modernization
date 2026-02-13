import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Role } from './role.entity';

@Entity('users')
@Index('idx_email', ['email'], { unique: true })
@Index('idx_company_active', ['company_id', 'is_active'])
@Index('idx_last_login', ['last_login'])
export class User {
  @PrimaryColumn('char', { length: 36 })
  id: string;

  @Column('varchar', { length: 255, unique: true })
  email: string;

  @Column('varchar', { length: 255 })
  password_hash: string;

  @Column('varchar', { length: 255 })
  name: string;

  @Column('varchar', { length: 128, nullable: true })
  first_name: string;

  @Column('varchar', { length: 128, nullable: true })
  last_name: string;

  @Column('varchar', { length: 20, nullable: true })
  phone: string;

  @Column('char', { length: 36 })
  company_id: string;

  @Column('boolean', { default: true })
  is_active: boolean;

  @Column('datetime', { nullable: true })
  last_login: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column('datetime', { nullable: true })
  deleted_at: Date;

  // Many-to-many relationship with roles
  @ManyToMany(() => Role, (role) => role.users, {
    eager: true,
    cascade: true,
  })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles: Role[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  /**
   * Get all role names for this user
   */
  getRoleNames(): string[] {
    return this.roles?.map((role) => role.name) || [];
  }

  /**
   * Check if user has specific role
   */
  hasRole(roleName: string): boolean {
    return this.roles?.some((role) => role.name === roleName) || false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roleNames: string[]): boolean {
    return this.roles?.some((role) => roleNames.includes(role.name)) || false;
  }

  /**
   * Check if user has all specified roles
   */
  hasAllRoles(roleNames: string[]): boolean {
    return roleNames.every((roleName) =>
      this.roles?.some((role) => role.name === roleName),
    );
  }
}
