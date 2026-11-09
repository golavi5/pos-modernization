import { IsString, IsUUID } from 'class-validator';

export class CreateLocationDto {
  @IsUUID()
  warehouse_id: string;

  @IsString()
  location_code: string;
}
