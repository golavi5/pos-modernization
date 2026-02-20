'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { useAuthStore } from '@/stores/authStore';
import { useToolbar } from '@/components/layout/ToolbarContext';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { setToolbar } = useToolbar();
  const t = useTranslations('dashboard');

  useEffect(() => {
    setToolbar({ title: t('title') });
  }, [setToolbar, t]);

  // Mock data for dashboard stats
  const stats = [
    {
      title: t('totalSalesToday'),
      value: '$12,459.50',
      description: t('fromTransactions', { count: 156 }),
      trend: '+12.5%',
      icon: 'TrendingUp',
    },
    {
      title: t('totalProducts'),
      value: '1,234',
      description: t('inInventory'),
      trend: '+3.2%',
      icon: 'Package',
    },
    {
      title: t('lowStockAlerts'),
      value: '23',
      description: t('itemsNeedRestock'),
      trend: '-8.1%',
      icon: 'AlertTriangle',
    },
    {
      title: t('pendingOrders'),
      value: '7',
      description: t('awaitingShipment'),
      trend: '+4.3%',
      icon: 'ShoppingCart',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('welcome', { name: user?.name || 'Usuario' })}
        </h1>
        <p className="text-secondary mt-1">
          {t('salesSummary')}
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