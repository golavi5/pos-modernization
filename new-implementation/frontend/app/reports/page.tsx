'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports</h1>
          <p className="text-gray-600 mt-1">Analyze your sales and business metrics</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales Report</CardTitle>
          </CardHeader>
          <CardContent className="min-h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">Sales analytics will be implemented in Task 3.5</p>
              <p className="text-sm text-gray-400 mt-2">Charts, trends, and summaries coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Report</CardTitle>
          </CardHeader>
          <CardContent className="min-h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">Inventory analytics will be implemented in Task 3.6</p>
              <p className="text-sm text-gray-400 mt-2">Stock levels, reorder alerts coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Customer Report</CardTitle>
          </CardHeader>
          <CardContent className="min-h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">Customer analytics will be implemented in Task 3.7</p>
              <p className="text-sm text-gray-400 mt-2">Demographics, purchase history coming soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Report</CardTitle>
          </CardHeader>
          <CardContent className="min-h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-600">Financial analytics will be implemented in Task 3.8</p>
              <p className="text-sm text-gray-400 mt-2">Revenue, margins, and forecasts coming soon</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
