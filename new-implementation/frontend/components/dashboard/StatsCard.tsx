'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  description: string;
  trend: string;
  icon: string;
}

const iconMap: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp className="h-8 w-8 text-blue-600" />,
  Package: <Package className="h-8 w-8 text-green-600" />,
  AlertTriangle: <AlertTriangle className="h-8 w-8 text-orange-600" />,
  ShoppingCart: <ShoppingCart className="h-8 w-8 text-purple-600" />,
};

export function StatsCard({
  title,
  value,
  description,
  trend,
  icon,
}: StatsCardProps) {
  const trendIsPositive = trend.startsWith('+');

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
            <p className="mt-1 text-xs text-gray-500">{description}</p>
          </div>
          <div className="ml-4">{iconMap[icon]}</div>
        </div>
        <div className="mt-4">
          <span
            className={`text-xs font-semibold ${
              trendIsPositive ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}