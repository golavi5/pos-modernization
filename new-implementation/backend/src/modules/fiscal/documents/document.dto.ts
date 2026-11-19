import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min,
  ValidateIf, ValidateNested,
} from 'class-validator';

export class BuyerDto {
  @ApiProperty() @IsString() @MaxLength(20) identification_number: string;
  @ApiProperty() @IsString() @MaxLength(1) dv: string;
  @ApiProperty() @IsString() @MaxLength(255) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) email?: string;
  @ApiProperty({ description: 'DIAN/provider code' }) @IsInt() type_document_identification_id: number;
  @ApiProperty({ description: 'DIAN/provider code' }) @IsInt() type_organization_id: number;
  @ApiProperty({ description: 'DIAN/provider code' }) @IsInt() type_liability_id: number;
  @ApiProperty({ description: 'DIAN/provider code' }) @IsInt() municipality_id: number;
  @ApiProperty({ description: 'DIAN/provider code' }) @IsInt() type_regime_id: number;
}

export class BagTaxDto {
  @ApiProperty() @IsNumber() @Min(0) per_unit: number;
  @ApiProperty() @IsNumber() @Min(0) total: number;
}

/** Amounts are whole pesos computed by the caller; the API holds no tax rules. */
export class LineDto {
  @ApiProperty() @IsString() @MaxLength(100) code: string;
  @ApiProperty() @IsString() @MaxLength(500) description: string;
  @ApiProperty() @IsNumber() @Min(0.000001) quantity: number;
  @ApiProperty({ description: 'price_amount sent to the provider' }) @IsNumber() @Min(0) unit_price: number;
  @ApiProperty({ description: 'IVA percent; 0 = exempt' }) @IsNumber() @Min(0) @Max(100) iva_rate: number;
  @ApiProperty({ description: 'Net of discount, excluding IVA' }) @IsNumber() @Min(0) subtotal: number;
  @ApiProperty() @IsNumber() @Min(0) iva_amount: number;
  @ApiProperty({ description: 'Net of discount, including IVA' }) @IsNumber() @Min(0) total: number;
  @ApiPropertyOptional({ description: 'Subtotal before discount, excluding IVA' }) @IsOptional() @IsNumber() @Min(0) gross_subtotal?: number;
  @ApiPropertyOptional({ type: BagTaxDto }) @IsOptional() @ValidateNested() @Type(() => BagTaxDto) bag_tax?: BagTaxDto;
}

export class ReferenceDto {
  @ApiProperty() @IsString() @MaxLength(50) number: string;
  @ApiProperty() @IsString() @MaxLength(128) cufe: string;
  @ApiProperty({ example: '2026-11-01' }) @IsString() @MaxLength(10) issue_date: string;
}

export class CreateDocumentDto {
  @ApiProperty({ enum: ['invoice', 'credit_note'] }) @IsIn(['invoice', 'credit_note']) type: 'invoice' | 'credit_note';

  @ApiPropertyOptional({ type: BuyerDto, nullable: true, description: 'Omit or null for a final consumer' })
  @IsOptional() @ValidateNested() @Type(() => BuyerDto)
  buyer?: BuyerDto | null;

  @ApiProperty({ type: [LineDto] }) @ArrayMinSize(1) @ArrayMaxSize(500) @ValidateNested({ each: true }) @Type(() => LineDto)
  lines: LineDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) head_note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) foot_note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) resolution_text?: string;
  @ApiPropertyOptional({ default: false }) @IsOptional() @IsBoolean() send_email?: boolean;

  @ApiPropertyOptional({ type: ReferenceDto, description: 'Required for credit notes: the original invoice' })
  @ValidateIf((o: CreateDocumentDto) => o.type === 'credit_note') @ValidateNested() @Type(() => ReferenceDto)
  reference?: ReferenceDto;

  @ApiPropertyOptional({ description: 'Required for credit notes' })
  @ValidateIf((o: CreateDocumentDto) => o.type === 'credit_note') @IsInt() discrepancy_code?: number;

  @ApiPropertyOptional({ description: 'Required for credit notes' })
  @ValidateIf((o: CreateDocumentDto) => o.type === 'credit_note') @IsString() @MaxLength(500) discrepancy_description?: string;
}

export class DocumentListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 50;
  @ApiPropertyOptional() @IsOptional() @IsString() cursor?: string;
  @ApiPropertyOptional({ enum: ['pending', 'sent', 'validated', 'rejected', 'failed'] })
  @IsOptional() @IsIn(['pending', 'sent', 'validated', 'rejected', 'failed']) status?: string;
}
