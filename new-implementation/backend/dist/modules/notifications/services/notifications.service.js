"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notification_entity_1 = require("../entities/notification.entity");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationRepo) {
        this.notificationRepo = notificationRepo;
        this.logger = new common_1.Logger(NotificationsService_1.name);
    }
    async findAll(companyId, userId, query) {
        const { unreadOnly, type, page = 1, pageSize = 20 } = query;
        const qb = this.notificationRepo
            .createQueryBuilder('n')
            .where('n.companyId = :companyId', { companyId })
            .andWhere('(n.userId = :userId OR n.userId IS NULL)', { userId })
            .orderBy('n.createdAt', 'DESC');
        if (unreadOnly)
            qb.andWhere('n.isRead = false');
        if (type)
            qb.andWhere('n.type = :type', { type });
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
    async getUnreadCount(companyId, userId) {
        const count = await this.notificationRepo
            .createQueryBuilder('n')
            .where('n.companyId = :companyId', { companyId })
            .andWhere('(n.userId = :userId OR n.userId IS NULL)', { userId })
            .andWhere('n.isRead = false')
            .getCount();
        return { count };
    }
    async markAsRead(id, companyId) {
        const notification = await this.notificationRepo.findOne({
            where: { id, companyId },
        });
        if (!notification)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        notification.isRead = true;
        notification.readAt = new Date();
        await this.notificationRepo.save(notification);
        return this.toResponse(notification);
    }
    async markAllAsRead(companyId, userId) {
        const result = await this.notificationRepo
            .createQueryBuilder()
            .update(notification_entity_1.Notification)
            .set({ isRead: true, readAt: new Date() })
            .where('companyId = :companyId', { companyId })
            .andWhere('(userId = :userId OR userId IS NULL)', { userId })
            .andWhere('isRead = false')
            .execute();
        return { updated: result.affected || 0 };
    }
    async remove(id, companyId) {
        const notification = await this.notificationRepo.findOne({
            where: { id, companyId },
        });
        if (!notification)
            throw new common_1.NotFoundException(`Notification ${id} not found`);
        await this.notificationRepo.remove(notification);
        return { message: 'Notification deleted' };
    }
    async clearRead(companyId) {
        const result = await this.notificationRepo
            .createQueryBuilder()
            .delete()
            .from(notification_entity_1.Notification)
            .where('companyId = :companyId', { companyId })
            .andWhere('isRead = true')
            .execute();
        return { deleted: result.affected || 0 };
    }
    async create(params) {
        const notification = this.notificationRepo.create(params);
        return this.notificationRepo.save(notification);
    }
    async notifyLowStock(params) {
        const isCritical = params.currentStock === 0;
        await this.create({
            companyId: params.companyId,
            type: isCritical ? notification_entity_1.NotificationType.OUT_OF_STOCK : notification_entity_1.NotificationType.LOW_STOCK,
            priority: isCritical ? notification_entity_1.NotificationPriority.CRITICAL : notification_entity_1.NotificationPriority.HIGH,
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
        this.logger.log(`Low stock notification created for product ${params.productId} in company ${params.companyId}`);
    }
    async notifyLargeSale(params) {
        await this.create({
            companyId: params.companyId,
            type: notification_entity_1.NotificationType.LARGE_SALE,
            priority: notification_entity_1.NotificationPriority.MEDIUM,
            title: `💰 Venta grande: $${params.amount.toLocaleString('es-CO')}`,
            message: params.customerName
                ? `Se registró una venta de $${params.amount.toLocaleString('es-CO')} para ${params.customerName}.`
                : `Se registró una venta de $${params.amount.toLocaleString('es-CO')}.`,
            data: { saleId: params.saleId, amount: params.amount },
        });
    }
    async notifyNewUser(params) {
        await this.create({
            companyId: params.companyId,
            type: notification_entity_1.NotificationType.NEW_USER,
            priority: notification_entity_1.NotificationPriority.LOW,
            title: `👤 Nuevo usuario: ${params.userName}`,
            message: `Se registró el usuario ${params.userName} (${params.userEmail}) en el sistema.`,
            data: { userName: params.userName, userEmail: params.userEmail },
        });
    }
    async notifySystem(params) {
        await this.create({
            companyId: params.companyId,
            type: notification_entity_1.NotificationType.SYSTEM,
            priority: params.priority || notification_entity_1.NotificationPriority.LOW,
            title: params.title,
            message: params.message,
        });
    }
    toResponse(n) {
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
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map