import { IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class AddLoyaltyPointsDto {
  @IsNumber()
  @Min(1)
  points: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateLoyaltyPointsDto {
  @IsNumber()
  points: number;

  @IsString()
  operation: 'add' | 'subtract' | 'set';

  @IsOptional()
  @IsString()
  reason?: string;
}
