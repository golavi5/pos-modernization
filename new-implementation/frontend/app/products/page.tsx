'use client';

import { useState } from 'react';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import { ProductList } from '@/components/products/ProductList';
import { ProductFilters } from '@/components/products/ProductFilters';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ProductsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useProducts({ search });
  const deleteProduct = useDeleteProduct();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await deleteProduct.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <div className="flex gap-2">
          <Link href="/products/categories">
            <Button variant="outline">Categories</Button>
          </Link>
          <Link href="/products/new">
            <Button>Add Product</Button>
          </Link>
        </div>
      </div>

      <ProductFilters onSearch={setSearch} onCategoryFilter={() => {}} />

      {isLoading ? (
        <div>Loading products...</div>
      ) : (
        <ProductList products={data?.products || []} onDelete={handleDelete} />
      )}

      {data && (
        <div className="text-sm text-gray-500">
          Showing {data.products?.length || 0} of {data.total || 0} products
        </div>
      )}
    </div>
  );
}
