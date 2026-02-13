'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Sale {
  id: string;
  customer: string;
  email: string;
  amount: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
}

const mockSales: Sale[] = [
  {
    id: '1',
    customer: 'John Doe',
    email: 'john@example.com',
    amount: '$250.50',
    date: 'Today',
    status: 'completed',
  },
  {
    id: '2',
    customer: 'Jane Smith',
    email: 'jane@example.com',
    amount: '$180.25',
    date: 'Today',
    status: 'completed',
  },
  {
    id: '3',
    customer: 'Bob Johnson',
    email: 'bob@example.com',
    amount: '$420.00',
    date: 'Yesterday',
    status: 'completed',
  },
  {
    id: '4',
    customer: 'Alice Williams',
    email: 'alice@example.com',
    amount: '$95.75',
    date: 'Yesterday',
    status: 'pending',
  },
  {
    id: '5',
    customer: 'Charlie Brown',
    email: 'charlie@example.com',
    amount: '$320.00',
    date: '2 days ago',
    status: 'completed',
  },
];

const statusVariants: Record<string, 'default' | 'secondary' | 'destructive'> = {
  completed: 'default',
  pending: 'secondary',
  cancelled: 'destructive',
};

export function RecentSales() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Sales</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockSales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{sale.customer}</p>
                <p className="text-sm text-gray-500">{sale.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{sale.amount}</p>
                  <p className="text-xs text-gray-500">{sale.date}</p>
                </div>
                <Badge variant={statusVariants[sale.status]}>
                  {sale.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}