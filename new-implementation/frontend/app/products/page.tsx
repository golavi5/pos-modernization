'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Products</h1>
        <p className="text-gray-600 mt-1">Manage your product catalog</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Product list will be implemented in Task 3.2</p>
            <p className="text-sm text-gray-400 mt-2">Database integration and search functionality coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}