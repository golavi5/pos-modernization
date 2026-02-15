'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">Manage your customer relationships</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Customer management will be implemented in Task 3.4</p>
            <p className="text-sm text-gray-400 mt-2">Search, filtering, and customer profiles coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
