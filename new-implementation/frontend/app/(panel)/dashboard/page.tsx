'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { useSalesStats, useTodaySales } from '@/hooks/useSales';
import { useSalesByPeriod } from '@/hooks/useReports';
import { lastSevenDays, lastSevenDaysStart } from '@/lib/dashboard';
import { formatCOP } from '@/lib/utils';

export default function DashboardPage() {
  const t = useTranslations('dashboard.kpi');
  // `stats` is the last-30-days summary; `today` is today's. Both are the
  // backend's snake_case SalesSummaryDto (manager/admin only: a cashier gets 403
  // and the cards show '—').
  const { data: stats } = useSalesStats();
  const { data: today } = useTodaySales();
  const locale = useLocale();
  // Fixed for the lifetime of the page: a `new Date()` in the query params would
  // change the query key on every render and refetch forever.
  const weekQuery = useMemo(
    () => ({ period: 'daily' as const, startDate: lastSevenDaysStart(), endDate: new Date().toISOString() }),
    [],
  );
  const { data: week } = useSalesByPeriod(weekQuery);

  const chartData = lastSevenDays(week?.periodData, locale);

  return (
    <div className="p-5 space-y-4 overflow-auto h-full">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <StatsCard
          title={t('salesToday')}
          value={today ? formatCOP(today.total_revenue) : '—'}
          accentClass="border-primary"
        />
        <StatsCard
          title={t('transactions')}
          value={today ? String(today.total_orders) : '—'}
          accentClass="border-emerald-500"
        />
        <StatsCard
          title={t('avgTicket')}
          value={stats ? formatCOP(stats.average_order_value) : '—'}
          accentClass="border-amber-500"
        />
        <StatsCard
          title={t('totalSales')}
          value={stats ? String(stats.total_orders) : '—'}
          accentClass="border-violet-500"
        />
      </div>

      {/* Chart + Quick actions */}
      <div className="grid grid-cols-[1fr_240px] gap-3">
        <SalesChart data={chartData} />
        <QuickActions />
      </div>

      {/* Recent sales */}
      <RecentSales />
    </div>
  );
}
