import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './services/notifications.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import {
  NotificationQueryDto,
  NotificationListDto,
  NotificationResponseDto,
  UnreadCountDto,
} from './dto/notification.dto';
import { NotificationPriority, NotificationType } from './entities/notification.entity';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly schedulerService: NotificationSchedulerService,
  ) {}

  @Get()
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiResponse({ status: 200, type: NotificationListDto })
  async findAll(
    @CurrentUser() user: any,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListDto> {
    return this.notificationsService.findAll(user.companyId, user.id, query);
  }

  @Get('unread-count')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, type: UnreadCountDto })
  async getUnreadCount(@CurrentUser() user: any): Promise<UnreadCountDto> {
    return this.notificationsService.getUnreadCount(user.companyId, user.id);
  }

  @Patch(':id/read')
  @Roles('admin', 'manager', 'staff')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, type: NotificationResponseDto })
  async markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<NotificationResponseDto> {
    return this.notificationsService.markAsRead(id, user.companyId);
  }

  @Patch('read-all')
  @Roles('admin', 'manager', 'staff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser() user: any): Promise<{ updated: number }> {
    return this.notificationsService.markAllAsRead(user.companyId, user.id);
  }

  @Delete('clear-read')
  @Roles('admin', 'manager')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete all read notifications' })
  async clearRead(@CurrentUser() user: any): Promise<{ deleted: number }> {
    return this.notificationsService.clearRead(user.companyId);
  }

  @Delete(':id')
  @Roles('admin', 'manager', 'staff')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ): Promise<{ message: string }> {
    return this.notificationsService.remove(id, user.companyId);
  }

  // ==================== ADMIN TOOLS ====================

  @Post('test')
  @Roles('admin')
  @ApiOperation({ summary: 'Create test notification (admin)' })
  async createTest(
    @CurrentUser() user: any,
    @Body() body: { title: string; message: string; type?: string; priority?: string },
  ): Promise<NotificationResponseDto> {
    const notification = await this.notificationsService.create({
      companyId: user.companyId,
      type: (body.type as NotificationType) || NotificationType.SYSTEM,
      priority: (body.priority as NotificationPriority) || NotificationPriority.MEDIUM,
      title: body.title,
      message: body.message,
      data: { test: true, createdBy: user.id },
    });
    return {
      id: notification.id,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      isRead: notification.isRead,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
    };
  }

  @Post('check-stock')
  @Roles('admin')
  @ApiOperation({ summary: 'Trigger low stock check manually (admin)' })
  async checkStock(@CurrentUser() user: any): Promise<{ checked: number; notified: number }> {
    return this.schedulerService.checkLowStock(user.companyId);
  }

  @Delete('admin/clean-old')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean old read notifications (admin)' })
  async cleanOld(): Promise<{ deleted: number }> {
    return this.schedulerService.cleanOldNotifications();
  }
}
