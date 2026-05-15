'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CreateProductDto } from '@/types/product';

interface ProductFormFieldsProps {
  formData: CreateProductDto;
  onChange: (field: keyof CreateProductDto, value: string | number) => void;
  t: (key: string) => string;
}

export function ProductFormFields({ formData, onChange, t }: ProductFormFieldsProps) {
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
        <Label htmlFor="category">{t('category')}</Label>
        <Input
          id="category"
          type="text"
          value={formData.category}
          onChange={(e) => onChange('category', e.target.value)}
          placeholder={t('categoryPlaceholder')}
        />
      </div>
      <div>
        <Label htmlFor="unit_of_measure">{t('unitOfMeasure')}</Label>
        <select
          id="unit_of_measure"
          value={formData.unit_of_measure}
          onChange={(e) => onChange('unit_of_measure', e.target.value)}
          className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="unidad">{t('unit')}</option>
          <option value="kg">{t('kilogram')}</option>
          <option value="lb">{t('pound')}</option>
          <option value="lt">{t('liter')}</option>
          <option value="mt">{t('meter')}</option>
          <option value="caja">{t('box')}</option>
          <option value="paquete">{t('package')}</option>
        </select>
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
        />
      </div>
      <div>
        <Label htmlFor="min_stock_level">{t('minStock')}</Label>
        <Input
          id="min_stock_level"
          type="number"
          min="0"
          value={formData.min_stock_level}
          onChange={(e) => onChange('min_stock_level', parseInt(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
      <div>
        <Label htmlFor="max_stock_level">{t('maxStock')}</Label>
        <Input
          id="max_stock_level"
          type="number"
          min="0"
          value={formData.max_stock_level}
          onChange={(e) => onChange('max_stock_level', parseInt(e.target.value) || 0)}
          placeholder="0"
        />
      </div>
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
            <img
              src={formData.image_url}
              alt={t('preview')}
              className="w-32 h-32 object-cover rounded border"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
