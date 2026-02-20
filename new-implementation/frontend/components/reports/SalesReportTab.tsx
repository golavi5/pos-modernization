'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReportFilters } from './ReportFilters';
import { useSalesSummary, useSalesByPeriod, useRevenueTrends } from '@/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Package, CreditCard } from 'lucide-react';
import type { ReportQuery, ExportFormat } from '@/types/reports';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const formatPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

export function SalesReportTab() {
  const [query, setQuery] = useState<ReportQuery>({ period: 'monthly', limit: 10 });

  const { data: summary, isLoading: sumLoading } = useSalesSummary(query);
  const { data: periodData, isLoading: perLoading } = useSalesByPeriod(query);
  const { data: trends } = useRevenueTrends(query);

  const handleExport = (format: ExportFormat) => {
    window.open(reportsApi.exportSalesReport({ ...query, format }), '_blank');
  };

  if (sumLoading || perLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-100 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-32 bg-gray-100 rounded" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportFilters onFilterChange={setQuery} onExport={handleExport} />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ventas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Total Ventas</CardTitle>
            <ShoppingCart className="h-4 w-4 text-quaternary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalSales ?? 0}</div>
            {summary?.comparedToLastPeriod && (
              <p className="text-xs flex items-center gap-1 mt-1 text-tertiary">
                {summary.comparedToLastPeriod.salesChange >= 0
                  ? <TrendingUp className="h-3 w-3 text-green-600" />
                  : <TrendingDown className="h-3 w-3 text-red-600" />}
                <span className={summary.comparedToLastPeriod.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPct(summary.comparedToLastPeriod.salesChange)}
                </span>
                vs período anterior
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ingresos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-quaternary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue ?? 0)}</div>
            {summary?.comparedToLastPeriod && (
              <p className="text-xs flex items-center gap-1 mt-1 text-tertiary">
                {summary.comparedToLastPeriod.revenueChange >= 0
                  ? <TrendingUp className="h-3 w-3 text-green-600" />
                  : <TrendingDown className="h-3 w-3 text-red-600" />}
                <span className={summary.comparedToLastPeriod.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPct(summary.comparedToLastPeriod.revenueChange)}
                </span>
                vs período anterior
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ganancia */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Ganancia Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-quaternary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.totalProfit ?? 0)}</div>
            {summary?.comparedToLastPeriod && (
              <p className="text-xs flex items-center gap-1 mt-1 text-tertiary">
                {summary.comparedToLastPeriod.profitChange >= 0
                  ? <TrendingUp className="h-3 w-3 text-green-600" />
                  : <TrendingDown className="h-3 w-3 text-red-600" />}
                <span className={summary.comparedToLastPeriod.profitChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {formatPct(summary.comparedToLastPeriod.profitChange)}
                </span>
                vs período anterior
              </p>
            )}
          </CardContent>
        </Card>

        {/* Ticket Promedio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-secondary">Ticket Promedio</CardTitle>
            <Package className="h-4 w-4 text-quaternary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary?.averageTicket ?? 0)}</div>
            <p className="text-xs text-tertiary mt-1">{summary?.totalItems ?? 0} artículos vendidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Métodos de Pago */}
      {trends && trends.byPaymentMethod.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Método de Pago</CardTitle>
            <CardDescription>Distribución de ingresos según forma de pago</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trends.byPaymentMethod.map((method) => (
                <div key={method.paymentMethod} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-tertiary" />
                    <div>
                      <p className="font-medium capitalize">{method.paymentMethod}</p>
                      <p className="text-sm text-tertiary">{method.transactionCount} transacciones</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(method.totalRevenue)}</p>
                    <p className="text-sm text-tertiary">{method.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Ventas por Período */}
      {periodData && periodData.periodData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Período</CardTitle>
            <CardDescription>Desglose detallado de ventas en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-tertiary text-xs uppercase">
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-right py-3 px-4">Ventas</th>
                    <th className="text-right py-3 px-4">Ingresos</th>
                    <th className="text-right py-3 px-4">Artículos</th>
                    <th className="text-right py-3 px-4">Ticket Prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {periodData.periodData.map((row, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{row.date}</td>
                      <td className="py-3 px-4 text-right">{row.totalSales}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(row.totalRevenue)}</td>
                      <td className="py-3 px-4 text-right">{row.totalItems}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(row.averageTicket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
