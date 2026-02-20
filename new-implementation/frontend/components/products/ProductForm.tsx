'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Product, CreateProductDto } from '@/types/product';

interface ProductFormProps {
  product?: Product;
  onSubmit: (data: CreateProductDto) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading,
}: ProductFormProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const [formData, setFormData] = useState<CreateProductDto>({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category: '',
    price: 0,
    cost: 0,
    stock_quantity: 0,
    min_stock_level: 0,
    max_stock_level: 0,
    unit_of_measure: 'unidad',
    tax_rate: 19,
    image_url: '',
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        barcode: product.barcode || '',
        category: product.category || '',
        price: product.price,
        cost: product.cost || 0,
        stock_quantity: product.stock_quantity,
        min_stock_level: product.min_stock_level || 0,
        max_stock_level: product.max_stock_level || 0,
        unit_of_measure: product.unit_of_measure || 'unidad',
        tax_rate: product.tax_rate || 19,
        image_url: product.image_url || '',
      });
    }
  }, [product]);

  const handleChange = (field: keyof CreateProductDto, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name */}
        <div className="md:col-span-2">
          <Label htmlFor="name">
            {t('productName')}
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('productNamePlaceholder')}
            required
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <Label htmlFor="description">{t('description')}</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* SKU */}
        <div>
          <Label htmlFor="sku">
            {t('sku')}
          </Label>
          <Input
            id="sku"
            type="text"
            value={formData.sku}
            onChange={(e) => handleChange('sku', e.target.value)}
            placeholder={t('skuPlaceholder')}
            required
          />
        </div>

        {/* Barcode */}
        <div>
          <Label htmlFor="barcode">{t('barcode')}</Label>
          <Input
            id="barcode"
            type="text"
            value={formData.barcode}
            onChange={(e) => handleChange('barcode', e.target.value)}
            placeholder={t('barcodePlaceholder')}
          />
        </div>

        {/* Category */}
        <div>
          <Label htmlFor="category">{t('category')}</Label>
          <Input
            id="category"
            type="text"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            placeholder={t('categoryPlaceholder')}
          />
        </div>

        {/* Unit of measure */}
        <div>
          <Label htmlFor="unit_of_measure">{t('unitOfMeasure')}</Label>
          <select
            id="unit_of_measure"
            value={formData.unit_of_measure}
            onChange={(e) => handleChange('unit_of_measure', e.target.value)}
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

        {/* Price */}
        <div>
          <Label htmlFor="price">
            {t('salePrice')}
          </Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            required
          />
        </div>

        {/* Cost */}
        <div>
          <Label htmlFor="cost">{t('cost')}</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            min="0"
            value={formData.cost}
            onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
          />
        </div>

        {/* Stock quantity */}
        <div>
          <Label htmlFor="stock_quantity">
            {t('stockQuantity')}
          </Label>
          <Input
            id="stock_quantity"
            type="number"
            min="0"
            value={formData.stock_quantity}
            onChange={(e) =>
              handleChange('stock_quantity', parseInt(e.target.value) || 0)
            }
            placeholder="0"
            required
          />
        </div>

        {/* Min stock */}
        <div>
          <Label htmlFor="min_stock_level">{t('minStock')}</Label>
          <Input
            id="min_stock_level"
            type="number"
            min="0"
            value={formData.min_stock_level}
            onChange={(e) =>
              handleChange('min_stock_level', parseInt(e.target.value) || 0)
            }
            placeholder="0"
          />
        </div>

        {/* Max stock */}
        <div>
          <Label htmlFor="max_stock_level">{t('maxStock')}</Label>
          <Input
            id="max_stock_level"
            type="number"
            min="0"
            value={formData.max_stock_level}
            onChange={(e) =>
              handleChange('max_stock_level', parseInt(e.target.value) || 0)
            }
            placeholder="0"
          />
        </div>

        {/* Tax rate */}
        <div>
          <Label htmlFor="tax_rate">{t('taxRate')}</Label>
          <Input
            id="tax_rate"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.tax_rate}
            onChange={(e) => handleChange('tax_rate', parseFloat(e.target.value) || 0)}
            placeholder="19"
          />
        </div>

        {/* Image URL */}
        <div className="md:col-span-2">
          <Label htmlFor="image_url">{t('imageUrl')}</Label>
          <Input
            id="image_url"
            type="url"
            value={formData.image_url}
            onChange={(e) => handleChange('image_url', e.target.value)}
            placeholder={t('imageUrlPlaceholder')}
          />
          {formData.image_url && (
            <div className="mt-2">
              <img
                src={formData.image_url}
                alt={t('preview')}
                className="w-32 h-32 object-cover rounded border"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? tCommon('saving') : product ? tCommon('update') : tCommon('create')}
        </Button>
      </div>
    </form>
  );
}
