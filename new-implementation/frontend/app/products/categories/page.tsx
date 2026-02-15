'use client';

import { CategoryManager } from '@/components/products/CategoryManager';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function CategoriesPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Product Categories</h1>
          <p className="text-gray-600">Manage product categories</p>
        </div>
        <Link href="/products">
          <Button variant="outline">Back to Products</Button>
        </Link>
      </div>

      <CategoryManager />
    </div>
  );
}
