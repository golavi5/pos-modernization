import { IsEnum, IsOptional, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum ExportFormat {
  PDF = 'pdf',
  EXCEL = 'excel',
  CSV = 'csv',
}

export class ReportQueryDto {
  @ApiProperty({ enum: PeriodType, default: PeriodType.MONTHLY })
  @IsEnum(PeriodType)
  @IsOptional()
  period?: PeriodType = PeriodType.MONTHLY;

  @ApiProperty({ required: false, example: '2026-01-01' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false, example: '2026-12-31' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ required: false, default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number = 10;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  warehouseId?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  categoryId?: number;
}

export class ExportQueryDto extends ReportQueryDto {
  @ApiProperty({ enum: ExportFormat, default: ExportFormat.PDF })
  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat = ExportFormat.PDF;

  @ApiProperty({ required: false })
  @IsOptional()
  filename?: string;
}
