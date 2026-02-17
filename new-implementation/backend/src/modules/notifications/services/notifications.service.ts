import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';
import { NotificationQueryDto, NotificationListDto, NotificationResponseDto } from '../dto/notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  /**
   * Get paginated notifications for a user/company
   */
  async findAll(
    companyId: string,
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationListDto> {
    const { unreadOnly, type, page = 1, pageSize = 20 } = query;

    const qb = this.notificationRepo
      .createQueryBuilder('n')
      .where('n.companyId = :companyId', { companyId })
      .andWhere('(n.userId = :userId OR n.userId IS NULL)', { userId })
      .orderBy('n.createdAt', 'DESC');

    if (unreadOnly) qb.andWhere('n.isRead = false');
    if (type) qb.andWhere('n.type = :type', { type });

    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    const unreadCount = await this.notificationRepo.count({
      where: { companyId, isRead: false },
    });

    return {
      data: data.map(this.toResponse),
      total,
      unreadCount,
      page,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get unread count badge
   */
  async getUnreadCount(companyId: string, userId: string): Promise<{ count: number }> {
    const count = await this.notificationRepo
      .createQueryBuilder('n')
      .where('n.companyId = :companyId', { companyId })
      .andWhere('(n.userId = :userId OR n.userId IS NULL)', { userId })
      .andWhere('n.isRead = false')
      .getCount();
    return { count };
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(id: number, companyId: string): Promise<NotificationResponseDto> {
    const notification = await this.notificationRepo.findOne({
      where: { id, companyId },
    });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);

    notification.isRead = true;
    notification.readAt = new Date();
    await this.notificationRepo.save(notification);
    return this.toResponse(notification);
  }

  /**
   * Mark all as read
   */
  async markAllAsRead(companyId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('companyId = :companyId', { companyId })
      .andWhere('(userId = :userId OR userId IS NULL)', { userId })
      .andWhere('isRead = false')
      .execute();

    return { updated: result.affected || 0 };
  }

  /**
   * Delete notification
   */
  async remove(id: number, companyId: string): Promise<{ message: string }> {
    const notification = await this.notificationRepo.findOne({
      where: { id, companyId },
    });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    await this.notificationRepo.remove(notification);
    return { message: 'Notification deleted' };
  }

  /**
   * Delete all read notifications
   */
  async clearRead(companyId: string): Promise<{ deleted: number }> {
    const result = await this.notificationRepo
      .createQueryBuilder()
      .delete()
      .from(Notification)
      .where('companyId = :companyId', { companyId })
      .andWhere('isRead = true')
      .execute();
    return { deleted: result.affected || 0 };
  }

  // ==============================
  // Internal creation methods
  // ==============================

  /**
   * Create a notification (used by scheduler and other services)
   */
  async create(params: {
    companyId: string;
    userId?: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    data?: Record<string, any>;
  }): Promise<Notification> {
    const notification = this.notificationRepo.create(params);
    return this.notificationRepo.save(notification);
  }

  /**
   * Low stock notification
   */
  async notifyLowStock(params: {
    companyId: string;
    productId: number;
    productName: string;
    sku: string;
    currentStock: number;
    reorderPoint: number;
  }): Promise<void> {
    const isCritical = params.currentStock === 0;

    await this.create({
      companyId: params.companyId,
      type: isCritical ? NotificationType.OUT_OF_STOCK : NotificationType.LOW_STOCK,
      priority: isCritical ? NotificationPriority.CRITICAL : NotificationPriority.HIGH,
      title: isCritical
        ? `⚠️ Sin stock: ${params.productName}`
        : `📦 Stock bajo: ${params.productName}`,
      message: isCritical
        ? `El producto "${params.productName}" (${params.sku}) se quedó sin stock. Reabastecer urgente.`
        : `El producto "${params.productName}" (${params.sku}) tiene solo ${params.currentStock} unidades. Punto de reorden: ${params.reorderPoint}.`,
      data: {
        productId: params.productId,
        sku: params.sku,
        currentStock: params.currentStock,
        reorderPoint: params.reorderPoint,
      },
    });

    this.logger.log(
      `Low stock notification created for product ${params.productId} in company ${params.companyId}`,
    );
  }

  /**
   * Large sale notification
   */
  async notifyLargeSale(params: {
    companyId: string;
    saleId: number;
    amount: number;
    customerName?: string;
  }): Promise<void> {
    await this.create({
      companyId: params.companyId,
      type: NotificationType.LARGE_SALE,
      priority: NotificationPriority.MEDIUM,
      title: `💰 Venta grande: $${params.amount.toLocaleString('es-CO')}`,
      message: params.customerName
        ? `Se registró una venta de $${params.amount.toLocaleString('es-CO')} para ${params.customerName}.`
        : `Se registró una venta de $${params.amount.toLocaleString('es-CO')}.`,
      data: { saleId: params.saleId, amount: params.amount },
    });
  }

  /**
   * New user notification
   */
  async notifyNewUser(params: {
    companyId: string;
    userName: string;
    userEmail: string;
  }): Promise<void> {
    await this.create({
      companyId: params.companyId,
      type: NotificationType.NEW_USER,
      priority: NotificationPriority.LOW,
      title: `👤 Nuevo usuario: ${params.userName}`,
      message: `Se registró el usuario ${params.userName} (${params.userEmail}) en el sistema.`,
      data: { userName: params.userName, userEmail: params.userEmail },
    });
  }

  /**
   * System notification
   */
  async notifySystem(params: {
    companyId: string;
    title: string;
    message: string;
    priority?: NotificationPriority;
  }): Promise<void> {
    await this.create({
      companyId: params.companyId,
      type: NotificationType.SYSTEM,
      priority: params.priority || NotificationPriority.LOW,
      title: params.title,
      message: params.message,
    });
  }

  private toResponse(n: Notification): NotificationResponseDto {
    return {
      id: n.id,
      type: n.type,
      priority: n.priority,
      title: n.title,
      message: n.message,
      data: n.data,
      isRead: n.isRead,
      readAt: n.readAt,
      createdAt: n.createdAt,
    };
  }
}
