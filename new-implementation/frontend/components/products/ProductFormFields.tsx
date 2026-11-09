'use client';

import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateProductDto } from '@/types/product';
import type { Translate } from '@/types/i18n';
import { AllowSaleWithoutStockField } from './AllowSaleWithoutStockField';
import { CategorySelect } from './CategorySelect';

interface ProductFormFieldsProps {
  formData: CreateProductDto;
  onChange: (field: keyof CreateProductDto, value: string | number | boolean | null) => void;
  t: Translate<'products'>;
  /** Editing: stock only changes through inventory adjust or a sale (SPEC-BACK-007). */
  stockReadOnly?: boolean;
}

export function ProductFormFields({ formData, onChange, t, stockReadOnly }: ProductFormFieldsProps) {
  const tCommon = useTranslations('common');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <Label htmlFor="name">{t('productName')}</Label>
        <Input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder={t('productNamePlaceholder')}
          required
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="description">{t('description')}</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={3}
          className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
      <div>
        <Label htmlFor="sku">{t('sku')}</Label>
        <Input
          id="sku"
          type="text"
          value={formData.sku}
          onChange={(e) => onChange('sku', e.target.value)}
          placeholder={t('skuPlaceholder')}
          required
        />
      </div>
      <div>
        <Label htmlFor="barcode">{t('barcode')}</Label>
        <Input
          id="barcode"
          type="text"
          value={formData.barcode}
          onChange={(e) => onChange('barcode', e.target.value)}
          placeholder={t('barcodePlaceholder')}
        />
      </div>
      <div>
        <Label htmlFor="category_id">{t('category')}</Label>
        <CategorySelect
          value={formData.category_id}
          onChange={(id) => onChange('category_id', id || null)}
          t={t}
        />
      </div>
      <div>
        <Label htmlFor="price">{t('salePrice')}</Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          value={formData.price}
          onChange={(e) => onChange('price', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
          required
        />
      </div>
      <div>
        <Label htmlFor="cost">{t('cost')}</Label>
        <Input
          id="cost"
          type="number"
          step="0.01"
          min="0"
          value={formData.cost}
          onChange={(e) => onChange('cost', parseFloat(e.target.value) || 0)}
          placeholder="0.00"
        />
      </div>
      <div>
        <Label htmlFor="stock_quantity">{t('stockQuantity')}</Label>
        <Input
          id="stock_quantity"
          type="number"
          min="0"
          value={formData.stock_quantity}
          onChange={(e) => onChange('stock_quantity', parseInt(e.target.value) || 0)}
          placeholder="0"
          required
          disabled={stockReadOnly}
        />
        {stockReadOnly && (
          <p className="text-xs text-tertiary mt-1">{t('stockReadOnlyHint')}</p>
        )}
      </div>
      <AllowSaleWithoutStockField formData={formData} onChange={onChange} t={t} />
      <div>
        <Label htmlFor="tax_rate">{t('taxRate')}</Label>
        <Input
          id="tax_rate"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formData.tax_rate}
          onChange={(e) => onChange('tax_rate', parseFloat(e.target.value) || 0)}
          placeholder="19"
        />
      </div>
      <div className="md:col-span-2">
        <Label htmlFor="image_url">{t('imageUrl')}</Label>
        <Input
          id="image_url"
          type="url"
          value={formData.image_url}
          onChange={(e) => onChange('image_url', e.target.value)}
          placeholder={t('imageUrlPlaceholder')}
        />
        {formData.image_url && (
          <div className="mt-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- live preview of a URL the user is still typing; the onError below hides a broken src, which next/image does not reproduce */}
            <img
              src={formData.image_url}
              alt={tCommon('preview')}
              className="w-32 h-32 object-cover rounded border"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
