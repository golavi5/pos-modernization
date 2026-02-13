'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function SalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Sales</h1>
        <p className="text-gray-600 mt-1">View and manage sales transactions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Transactions</CardTitle>
        </CardHeader>
        <CardContent className="min-h-96 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600">Sales list will be implemented in Task 3.3</p>
            <p className="text-sm text-gray-400 mt-2">Transaction history and analytics coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}