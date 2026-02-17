import { IsEnum, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType, NotificationPriority } from '../entities/notification.entity';

export class NotificationQueryDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiProperty({ required: false, enum: NotificationType })
  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @ApiProperty({ required: false, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiProperty({ required: false, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number = 20;
}

export class NotificationResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() type: NotificationType;
  @ApiProperty() priority: NotificationPriority;
  @ApiProperty() title: string;
  @ApiProperty() message: string;
  @ApiProperty() data: Record<string, any>;
  @ApiProperty() isRead: boolean;
  @ApiProperty() readAt?: Date;
  @ApiProperty() createdAt: Date;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationResponseDto] }) data: NotificationResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() unreadCount: number;
  @ApiProperty() page: number;
  @ApiProperty() totalPages: number;
}

export class UnreadCountDto {
  @ApiProperty() count: number;
}
