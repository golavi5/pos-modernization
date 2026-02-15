'use client';

import { useRouter } from 'next/navigation';
import { useCreateProduct } from '@/hooks/useProducts';
import { ProductForm } from '@/components/products/ProductForm';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();

  const handleSubmit = async (data: any) => {
    await createProduct.mutateAsync(data);
    router.push('/products');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Product</h1>
        <p className="text-gray-600">Add a new product to your catalog</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm onSubmit={handleSubmit} onCancel={() => router.back()} />
        </CardContent>
      </Card>
    </div>
  );
}
