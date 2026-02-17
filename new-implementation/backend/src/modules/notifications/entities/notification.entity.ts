import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  LOW_STOCK = 'low_stock',
  OUT_OF_STOCK = 'out_of_stock',
  SALE_MILESTONE = 'sale_milestone',
  NEW_USER = 'new_user',
  SYSTEM = 'system',
  REORDER_ALERT = 'reorder_alert',
  LARGE_SALE = 'large_sale',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Entity('notifications')
@Index('idx_notif_company_read', ['companyId', 'isRead'])
@Index('idx_notif_user', ['userId'])
@Index('idx_notif_created', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 36 })
  companyId: string;

  @Column('varchar', { length: 36, nullable: true })
  userId: string; // null = for all company users

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column({ type: 'enum', enum: NotificationPriority, default: NotificationPriority.MEDIUM })
  priority: NotificationPriority;

  @Column('varchar', { length: 255 })
  title: string;

  @Column('text')
  message: string;

  @Column('json', { nullable: true })
  data: Record<string, any>; // extra context (productId, orderId, etc.)

  @Column({ default: false })
  isRead: boolean;

  @Column('datetime', { nullable: true })
  readAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
