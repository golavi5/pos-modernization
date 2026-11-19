import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

/** Applied to `responsibility_codes` DTO fields. Values are RUT codes; the allowed set is VERIFY (anexo table not loaded yet). */
export function responsibilityCodesProp() {
  return (target: object, key: string) => {
    ApiProperty({ type: [String], example: ['O-13'] })(target, key);
    IsArray()(target, key);
    ArrayMaxSize(30)(target, key);
    IsString({ each: true })(target, key);
    MaxLength(16, { each: true })(target, key);
  };
}
