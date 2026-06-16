'use client';

import { useTranslations } from 'next-intl';
import { useProduct } from '@/hooks/useProducts';
import { StockBadge } from '@/components/products/StockBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations('products');
  const tc = useTranslations('common');
  const { data: product, isLoading } = useProduct(params.id);

  if (isLoading) return <div>{tc('loading')}</div>;
  if (!product) return <div>{t('productNotFound')}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <Link href={`/products/${product.id}/edit`}>
          <Button>{t('editProduct')}</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-64 object-cover rounded-md"
              />
            )}
            <div>
              <h3 className="text-sm font-medium text-tertiary">{t('description')}</h3>
              <p>{product.description || t('noDescription')}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">{t('sku')}</h3>
              <p>{product.sku}</p>
            </div>
            {product.barcode && (
              <div>
                <h3 className="text-sm font-medium text-tertiary">{t('barcode')}</h3>
                <p>{product.barcode}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-tertiary">{t('price')}</h3>
              <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">{t('cost')}</h3>
              <p className="text-lg">${(product.cost ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">{t('stockStatus')}</h3>
              <StockBadge
                stock={product.stock_quantity}
                reorderLevel={product.reorder_level ?? 0}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">{t('taxRate')}</h3>
              <p>{product.tax_rate}%</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">{t('status')}</h3>
              <p>{product.is_active ? tc('active') : tc('inactive')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
