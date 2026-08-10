'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReportFilters } from './ReportFilters';
import { useCustomerReport } from '@/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';
import { Users, Crown, UserPlus, UserX } from 'lucide-react';
import type { ReportQuery, ExportFormat } from '@/types/reports';
import { formatCOP } from '@/lib/utils';

const SEGMENT_COLORS: Record<string, string> = {
  VIP: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Regular: 'bg-blue-100 text-blue-800 border-blue-200',
  New: 'bg-green-100 text-green-800 border-green-200',
  Inactive: 'bg-gray-100 text-secondary border-gray-200',
};

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  VIP: <Crown className="h-5 w-5 text-yellow-500" />,
  Regular: <Users className="h-5 w-5 text-blue-500" />,
  New: <UserPlus className="h-5 w-5 text-green-500" />,
  Inactive: <UserX className="h-5 w-5 text-tertiary" />,
};

export function CustomerReportTab() {
  const t = useTranslations('reports');
  const tCustomers = useTranslations('customers');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [query, setQuery] = useState<ReportQuery>({ period: 'monthly', limit: 10 });
  const { data: report, isLoading } = useCustomerReport(query);

  const handleExport = (format: ExportFormat) => {
    window.open(reportsApi.exportCustomerReport({ ...query, format }), '_blank');
  };

  if (isLoading || !report) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-100 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-gray-100 rounded" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportFilters onFilterChange={setQuery} onExport={handleExport} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">{tCustomers('totalCustomers')}</CardTitle>
            <Users className="h-4 w-4 text-quaternary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.totalCustomers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">{t('customerTab.activeCustomers')}</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.activeCustomers}</div>
            <p className="text-xs text-tertiary mt-1">{t('customerTab.last30Days')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">{t('customerTab.newCustomers')}</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report.newCustomers}</div>
            <p className="text-xs text-tertiary mt-1">{t('customerTab.inPeriod')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Segmentación */}
      <Card>
        <CardHeader>
          <CardTitle>{t('customerTab.segmentation')}</CardTitle>
          <CardDescription>{t('customerTab.segmentationDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.segments.map((seg) => (
              <div key={seg.segment} className={`flex items-center justify-between p-4 border rounded-lg ${SEGMENT_COLORS[seg.segment] || ''}`}>
                <div className="flex items-center gap-3">
                  {SEGMENT_ICONS[seg.segment]}
                  <div>
                    <p className="font-semibold">{seg.segment}</p>
                    <p className="text-sm">{t('customerTab.customersPct', { count: seg.customerCount, pct: seg.percentage.toFixed(1) })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCOP(seg.totalRevenue)}</p>
                  <p className="text-xs">{t('customerTab.avgSpent', { amount: formatCOP(seg.averageSpent) })}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Buyers */}
      <Card>
        <CardHeader>
          <CardTitle>{t('customerTab.topBuyers')}</CardTitle>
          <CardDescription>{t('customerTab.topBuyersDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-tertiary text-xs uppercase">
                  <th className="text-left py-3 px-4">#</th>
                  <th className="text-left py-3 px-4">{tCommon('customer')}</th>
                  <th className="text-left py-3 px-4">{tCommon('contact')}</th>
                  <th className="text-right py-3 px-4">{tCommon('purchases')}</th>
                  <th className="text-right py-3 px-4">{t('customerTab.totalSpent')}</th>
                  <th className="text-right py-3 px-4">{t('avgTicket')}</th>
                  <th className="text-right py-3 px-4">{tCommon('points')}</th>
                </tr>
              </thead>
              <tbody>
                {report.topBuyers.map((customer, i) => (
                  <tr key={customer.customerId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {i < 3 ? <Crown className="h-4 w-4 text-yellow-500" /> : <span className="text-quaternary">{i + 1}</span>}
                    </td>
                    <td className="py-3 px-4 font-medium">{customer.customerName}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm">{customer.email}</p>
                        <p className="text-xs text-quaternary">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">{customer.totalPurchases}</td>
                    <td className="py-3 px-4 text-right font-bold">{formatCOP(customer.totalSpent)}</td>
                    <td className="py-3 px-4 text-right">{formatCOP(customer.averageTicket)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-secondary">
                        {t('customerTab.pts', { count: customer.loyaltyPoints })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
