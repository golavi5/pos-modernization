'use client';

import { useTranslations } from 'next-intl';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { useSalesStats, useTodaySales } from '@/hooks/useSales';
import { formatCOP } from '@/lib/utils';

const CHART_DATA = [
  { day: 'L', sales: 320000 },
  { day: 'M', sales: 410000 },
  { day: 'X', sales: 280000 },
  { day: 'J', sales: 520000 },
  { day: 'V', sales: 480000 },
  { day: 'S', sales: 560000 },
  { day: 'H', sales: 0 },
];

export default function DashboardPage() {
  const t = useTranslations('dashboard.kpi');
  // `stats` is the last-30-days summary; `today` is today's. Both are the
  // backend's snake_case SalesSummaryDto (manager/admin only: a cashier gets 403
  // and the cards show '—').
  const { data: stats } = useSalesStats();
  const { data: today } = useTodaySales();

  const chartData = CHART_DATA.map((d, i) =>
    i === CHART_DATA.length - 1 && today?.total_revenue !== undefined
      ? { ...d, sales: today.total_revenue }
      : d
  );

  return (
    <div className="p-5 space-y-4 overflow-auto h-full">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <StatsCard
          title={t('salesToday')}
          value={today ? formatCOP(today.total_revenue) : '—'}
          delta={t('deltaRevenue')}
          deltaPositive
          accentClass="border-primary"
        />
        <StatsCard
          title={t('transactions')}
          value={today ? String(today.total_orders) : '—'}
          delta={t('deltaTransactions')}
          deltaPositive
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
