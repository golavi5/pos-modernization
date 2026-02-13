'use client';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { useAuthStore } from '@/stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Mock data for dashboard stats
  const stats = [
    {
      title: 'Total Sales Today',
      value: '$12,459.50',
      description: 'from 156 transactions',
      trend: '+12.5%',
      icon: 'TrendingUp',
    },
    {
      title: 'Total Products',
      value: '1,234',
      description: 'in inventory',
      trend: '+3.2%',
      icon: 'Package',
    },
    {
      title: 'Low Stock Alerts',
      value: '23',
      description: 'items need restock',
      trend: '-8.1%',
      icon: 'AlertTriangle',
    },
    {
      title: 'Pending Orders',
      value: '7',
      description: 'awaiting shipment',
      trend: '+4.3%',
      icon: 'ShoppingCart',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Here's a summary of your sales performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Recent Sales */}
      <RecentSales />
    </div>
  );
}