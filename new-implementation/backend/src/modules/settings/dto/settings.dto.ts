import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsUrl,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCompanyDto {
  @ApiProperty({ required: false })
  @IsString() @IsOptional() @MaxLength(255)
  companyName?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() @MaxLength(50)
  nit?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  address?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() @MaxLength(20)
  phone?: string;

  @ApiProperty({ required: false })
  @IsEmail() @IsOptional()
  email?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() @MaxLength(255)
  website?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() @MaxLength(500)
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() @MaxLength(100)
  city?: string;

  @ApiProperty({ required: false })
  @IsString() @IsOptional() @MaxLength(100)
  country?: string;
}

export class UpdateTaxDto {
  @ApiProperty({ required: false, example: 19 })
  @Type(() => Number)
  @IsNumber() @IsOptional() @Min(0) @Max(100)
  taxRate?: number;

  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  taxIncludedInPrice?: boolean;

  @ApiProperty({ required: false, example: 'COP' })
  @IsString() @IsOptional() @MaxLength(20)
  currency?: string;

  @ApiProperty({ required: false, example: 'es-CO' })
  @IsString() @IsOptional() @MaxLength(10)
  locale?: string;
}

export class UpdatePaymentMethodsDto {
  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  paymentCash?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  paymentCard?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  paymentTransfer?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  paymentCredit?: boolean;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  paymentTransferInstructions?: string;
}

export class UpdateInventorySettingsDto {
  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  trackInventory?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  allowNegativeStock?: boolean;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber() @IsOptional() @Min(0)
  defaultReorderPoint?: number;
}

export class UpdateSalesSettingsDto {
  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  requireCustomer?: boolean;

  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  printReceiptAutomatically?: boolean;

  @ApiProperty({ required: false })
  @IsString() @IsOptional()
  receiptFooter?: string;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber() @IsOptional() @Min(0)
  largeSaleThreshold?: number;
}

export class UpdateLoyaltySettingsDto {
  @ApiProperty({ required: false })
  @IsBoolean() @IsOptional()
  loyaltyEnabled?: boolean;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber() @IsOptional() @Min(0)
  loyaltyPointsPerCurrency?: number;

  @ApiProperty({ required: false })
  @Type(() => Number)
  @IsNumber() @IsOptional() @Min(0)
  loyaltyPointValue?: number;
}
