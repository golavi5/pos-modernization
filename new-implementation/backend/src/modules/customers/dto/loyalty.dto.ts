import { IsNumber, Min } from 'class-validator';

export class AddLoyaltyPointsDto {
  @IsNumber()
  @Min(1)
  points: number;
}
