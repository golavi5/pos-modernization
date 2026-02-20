'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToolbar } from '@/components/layout/ToolbarContext';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: product, isLoading } = useProduct(params.id);
  const updateProduct = useUpdateProduct();
  const { setToolbar } = useToolbar();

  useEffect(() => {
    setToolbar({ title: 'Editar Producto', backHref: `/products/${params.id}` });
  }, [setToolbar, params.id]);

  const handleSubmit = async (data: any) => {
    await updateProduct.mutateAsync({ id: params.id, data });
    router.push(`/products/${params.id}`);
  };

  if (isLoading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Edit Product</h1>
        <p className="text-secondary">Update product information</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            product={product}
            onSubmit={handleSubmit}
            onCancel={() => router.back()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
