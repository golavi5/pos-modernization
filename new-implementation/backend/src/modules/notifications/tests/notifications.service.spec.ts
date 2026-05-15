import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../services/notifications.service';
import {
  Notification,
  NotificationType,
  NotificationPriority,
} from '../entities/notification.entity';

const mockQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getCount: jest.fn().mockResolvedValue(0),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  execute: jest.fn().mockResolvedValue({ affected: 0 }),
  delete: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repo: Repository<Notification>;

  const companyId = 'company-uuid';
  const userId = 'user-uuid';

  const mockNotification: Partial<Notification> = {
    id: 1,
    companyId,
    userId,
    type: NotificationType.SYSTEM,
    priority: NotificationPriority.LOW,
    title: 'Test notification',
    message: 'Hello world',
    isRead: false,
    readAt: null,
    createdAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useClass: Repository },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repo = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated notifications with unread count', async () => {
      const qb = mockQb();
      qb.getManyAndCount.mockResolvedValue([[mockNotification as Notification], 1]);
      jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);
      jest.spyOn(repo, 'count').mockResolvedValue(3);

      const result = await service.findAll(companyId, userId, {
        page: 1,
        pageSize: 20,
      } as any);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(3);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const qb = mockQb();
      qb.getCount.mockResolvedValue(5);
      jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.getUnreadCount(companyId, userId);

      expect(result.count).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const updated = { ...mockNotification, isRead: true, readAt: new Date() } as Notification;
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockNotification as Notification);
      jest.spyOn(repo, 'save').mockResolvedValue(updated);

      const result = await service.markAsRead(1, companyId);

      expect(result.isRead).toBe(true);
    });

    it('should throw NotFoundException when notification not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(service.markAsRead(999, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should return count of updated notifications', async () => {
      const qb = mockQb();
      qb.execute.mockResolvedValue({ affected: 4 });
      jest.spyOn(repo, 'createQueryBuilder').mockReturnValue(qb as any);

      const result = await service.markAllAsRead(companyId, userId);

      expect(result.updated).toBe(4);
    });
  });

  describe('remove', () => {
    it('should delete the notification', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(mockNotification as Notification);
      jest.spyOn(repo, 'remove').mockResolvedValue(mockNotification as Notification);

      const result = await service.remove(1, companyId);

      expect(result.message).toBe('Notification deleted');
    });

    it('should throw NotFoundException when not found', async () => {
      jest.spyOn(repo, 'findOne').mockResolvedValue(null);

      await expect(service.remove(999, companyId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('notifyLowStock', () => {
    it('should create a low-stock notification', async () => {
      jest.spyOn(repo, 'create').mockReturnValue(mockNotification as Notification);
      jest.spyOn(repo, 'save').mockResolvedValue(mockNotification as Notification);

      await service.notifyLowStock({
        companyId,
        productId: 42,
        productName: 'Widget',
        sku: 'SKU-001',
        currentStock: 2,
        reorderPoint: 5,
      });

      expect(repo.save).toHaveBeenCalled();
    });
  });
});
