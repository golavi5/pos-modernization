'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import type { Product, CreateProductDto } from '@/types/product';
import { apiErrorMessage } from '@/lib/utils';
import { FormError } from '@/components/ui/form-error';
import { ProductFormFields } from './ProductFormFields';

interface ProductFormProps {
  product?: Product;
  /** Form element id — allows an external submit button via `form={formId}` */
  formId?: string;
  /** Called after a successful create/update when using formId mode */
  onSuccess?: () => void;
  /** Legacy: called with form data (used when the page owns the mutation) */
  onSubmit?: (data: CreateProductDto) => void;
  /** Legacy: called on cancel (used when the page owns the mutation) */
  onCancel?: () => void;
  isLoading?: boolean;
}

export function ProductForm({
  product,
  formId,
  onSuccess,
  onSubmit,
  onCancel,
  isLoading: isLoadingProp,
}: ProductFormProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');

  // Internal mutations used when formId/onSuccess pattern is active
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isLoadingInternal = createMutation.isPending || updateMutation.isPending;
  const isLoading = isLoadingProp ?? (formId ? isLoadingInternal : false);

  const [formData, setFormData] = useState<CreateProductDto>({
    name: '',
    description: '',
    sku: '',
    barcode: '',
    category_id: undefined,
    price: 0,
    cost: 0,
    stock_quantity: 0,
    tax_rate: 19,
    image_url: '',
    allow_sale_without_stock: null,
  });

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description || '',
        sku: product.sku,
        barcode: product.barcode || '',
        category_id: product.category_id,
        price: product.price,
        cost: product.cost || 0,
        stock_quantity: product.stock_quantity,
        tax_rate: product.tax_rate || 19,
        image_url: product.image_url || '',
        allow_sale_without_stock: product.allow_sale_without_stock ?? null,
      });
    }
  }, [product]);

  const [submitError, setSubmitError] = useState('');

  const handleChange = (
    field: keyof CreateProductDto,
    value: string | number | boolean | null,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (onSubmit) {
      // Legacy mode: parent owns the mutation
      onSubmit(formData);
      return;
    }
    // formId/onSuccess mode: component owns the mutation
    try {
      if (product) {
        // El stock no se edita aquí: el backend lo ignora y solo cambia por ajuste o venta.
        const { stock_quantity: _stock, ...rest } = formData;
        await updateMutation.mutateAsync({ id: product.id, data: rest });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSuccess?.();
    } catch (err) {
      setSubmitError(apiErrorMessage(err, tCommon('requestFailed')));
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <ProductFormFields
        formData={formData}
        onChange={handleChange}
        t={t}
        stockReadOnly={!!product}
      />

      <FormError message={submitError} />

      {/* Buttons — only shown in legacy (non-formId) mode */}
      {!formId && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? tCommon('saving') : product ? tCommon('update') : tCommon('create')}
          </Button>
        </div>
      )}
    </form>
  );
}
