'use client';

import { useEffect } from 'react';
import { useProduct } from '@/hooks/useProducts';
import { StockBadge } from '@/components/products/StockBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToolbar } from '@/components/layout/ToolbarContext';
import Link from 'next/link';

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { data: product, isLoading } = useProduct(params.id);
  const { setToolbar } = useToolbar();

  useEffect(() => {
    setToolbar({ title: 'Detalle del Producto', backHref: '/products' });
  }, [setToolbar]);

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <Link href={`/products/${product.id}/edit`}>
          <Button>Edit Product</Button>
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
              <h3 className="text-sm font-medium text-tertiary">Description</h3>
              <p>{product.description || 'No description'}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">SKU</h3>
              <p>{product.sku}</p>
            </div>
            {product.barcode && (
              <div>
                <h3 className="text-sm font-medium text-tertiary">Barcode</h3>
                <p>{product.barcode}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-tertiary">Price</h3>
              <p className="text-2xl font-bold">${product.price.toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">Cost</h3>
              <p className="text-lg">${(product.cost ?? 0).toFixed(2)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">Stock Status</h3>
              <StockBadge
                stock={product.stock_quantity}
                reorderLevel={product.reorder_level ?? 0}
              />
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">Tax Rate</h3>
              <p>{product.tax_rate}%</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-tertiary">Status</h3>
              <p>{product.is_active ? 'Active' : 'Inactive'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
