export class CompanyResponseDto {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
