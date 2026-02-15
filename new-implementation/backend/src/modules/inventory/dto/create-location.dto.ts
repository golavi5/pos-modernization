import { IsString, IsNumber, IsUUID, Min } from 'class-validator';

export class CreateLocationDto {
  @IsUUID()
  warehouse_id: string;

  @IsString()
  location_code: string;

  @IsNumber()
  @Min(0)
  capacity: number;
}
