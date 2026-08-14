'use client';

import { Label } from '@/components/ui/label';
import type { CreateProductDto } from '@/types/product';
import type { Translate } from '@/types/i18n';

interface AllowSaleWithoutStockFieldProps {
  formData: CreateProductDto;
  onChange: (field: keyof CreateProductDto, value: string | number | boolean | null) => void;
  t: Translate<'products'>;
}

export function AllowSaleWithoutStockField({
  formData,
  onChange,
  t,
}: AllowSaleWithoutStockFieldProps) {
  return (
    <div>
      <Label htmlFor="allow_sale_without_stock">{t('allowSaleWithoutStock')}</Label>
      <select
        id="allow_sale_without_stock"
        value={
          formData.allow_sale_without_stock === null ||
          formData.allow_sale_without_stock === undefined
            ? 'inherit'
            : String(formData.allow_sale_without_stock)
        }
        onChange={(e) =>
          onChange(
            'allow_sale_without_stock',
            e.target.value === 'inherit' ? null : e.target.value === 'true',
          )
        }
        className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="inherit">{t('allowSaleWithoutStockInherit')}</option>
        <option value="true">{t('allowSaleWithoutStockYes')}</option>
        <option value="false">{t('allowSaleWithoutStockNo')}</option>
      </select>
    </div>
  );
}
