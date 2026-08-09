'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCreateProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function NewProductPage() {
  const t = useTranslations('products');
  const router = useRouter();
  const createProduct = useCreateProduct();

  const handleSubmit = async (data: any) => {
    await createProduct.mutateAsync(data);
    router.push('/products');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('createProduct')}</h1>
        <p className="text-secondary">{t('createProductSubtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('productInformation')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm onSubmit={handleSubmit} onCancel={() => router.back()} />
        </CardContent>
      </Card>
    </div>
  );
}
