'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useProduct, useUpdateProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const t = useTranslations('products');
  const tc = useTranslations('common');
  const { data: product, isLoading } = useProduct(params.id);
  const updateProduct = useUpdateProduct();

  const handleSubmit = async (data: any) => {
    await updateProduct.mutateAsync({ id: params.id, data });
    router.push(`/products/${params.id}`);
  };

  if (isLoading) return <div>{tc('loading')}</div>;
  if (!product) return <div>{t('productNotFound')}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('editProduct')}</h1>
        <p className="text-secondary">{t('updateProductInfo')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('productDetail')}</CardTitle>
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
