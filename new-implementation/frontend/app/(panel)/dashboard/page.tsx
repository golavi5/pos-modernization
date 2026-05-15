'use client';

import { StatsCard } from '@/components/dashboard/StatsCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentSales } from '@/components/dashboard/RecentSales';
import { useSalesStats } from '@/hooks/useSales';
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
  const { data: stats } = useSalesStats();

  const chartData = CHART_DATA.map((d, i) =>
    i === CHART_DATA.length - 1 && stats?.todayRevenue !== undefined
      ? { ...d, sales: stats.todayRevenue }
      : d
  );

  return (
    <div className="p-5 space-y-4 overflow-auto h-full">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-3">
        <StatsCard
          title="Ventas hoy"
          value={stats ? formatCOP(stats.todayRevenue) : '—'}
          delta="+12% vs ayer"
          deltaPositive
          accentClass="border-primary"
        />
        <StatsCard
          title="Transacciones"
          value={stats ? String(stats.todaySales) : '—'}
          delta="+5 vs ayer"
          deltaPositive
          accentClass="border-emerald-500"
        />
        <StatsCard
          title="Ticket promedio"
          value={stats ? formatCOP(stats.averageOrderValue) : '—'}
          accentClass="border-amber-500"
        />
        <StatsCard
          title="Total ventas"
          value={stats ? String(stats.totalSales) : '—'}
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
