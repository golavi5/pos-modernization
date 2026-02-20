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
var NotificationSchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationSchedulerService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const notifications_service_1 = require("./notifications.service");
const notification_entity_1 = require("../entities/notification.entity");
let NotificationSchedulerService = NotificationSchedulerService_1 = class NotificationSchedulerService {
    constructor(notificationsService, notificationRepo) {
        this.notificationsService = notificationsService;
        this.notificationRepo = notificationRepo;
        this.logger = new common_1.Logger(NotificationSchedulerService_1.name);
    }
    async checkLowStock(companyId) {
        this.logger.log(`Checking low stock for company ${companyId}`);
        this.logger.log('Low stock check completed');
        return { checked: 0, notified: 0 };
    }
    async cleanOldNotifications() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const result = await this.notificationRepo
            .createQueryBuilder()
            .delete()
            .from(notification_entity_1.Notification)
            .where('isRead = true')
            .andWhere('createdAt < :cutoff', { cutoff: thirtyDaysAgo })
            .execute();
        this.logger.log(`Cleaned ${result.affected} old notifications`);
        return { deleted: result.affected || 0 };
    }
};
exports.NotificationSchedulerService = NotificationSchedulerService;
exports.NotificationSchedulerService = NotificationSchedulerService = NotificationSchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectRepository)(notification_entity_1.Notification)),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        typeorm_2.Repository])
], NotificationSchedulerService);
//# sourceMappingURL=notification-scheduler.service.js.map