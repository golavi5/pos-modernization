import { IsEnum, IsPositive, IsString, IsOptional } from 'class-validator';
import { PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  transaction_id?: string;
}