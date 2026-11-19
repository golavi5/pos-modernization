import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Keyset pagination: `limit` + opaque `cursor` (the `next_cursor` of the previous page). */
export class PageQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 50;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;
}

export interface Page<T> {
  data: T[];
  next_cursor: string | null;
}

/** Pass `limit + 1` rows ordered by `id`; trims the extra one into the cursor. */
export function toPage<T extends { id: string }>(rows: T[], limit: number): Page<T> {
  const more = rows.length > limit;
  const data = more ? rows.slice(0, limit) : rows;
  return { data, next_cursor: more ? data[data.length - 1].id : null };
}
