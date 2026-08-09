'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReportFilters } from './ReportFilters';
import { useInventoryTurnover, useInventoryValueByWarehouse } from '@/hooks/useReports';
import { BarChart3, TrendingUp, AlertTriangle, Warehouse } from 'lucide-react';
import type { ReportQuery } from '@/types/reports';
import { formatCOP } from '@/lib/utils';

const STATUS_STYLES: Record<string, { labelKey: string; className: string }> = {
  'fast-moving': { labelKey: 'inventoryTab.statusFast', className: 'bg-green-100 text-green-700' },
  'slow-moving': { labelKey: 'inventoryTab.statusSlow', className: 'bg-orange-100 text-orange-700' },
  'dead-stock': { labelKey: 'inventoryTab.statusDead', className: 'bg-red-100 text-red-700' },
};

export function InventoryReportTab() {
  const t = useTranslations('reports');
  const tProducts = useTranslations('products');
  const tDashboard = useTranslations('dashboard');
  const [query, setQuery] = useState<ReportQuery>({ period: 'monthly', limit: 20 });
  const { data: turnover, isLoading: turnLoading } = useInventoryTurnover(query);
  const { data: warehouseValue, isLoading: valLoading } = useInventoryValueByWarehouse();

  if (turnLoading || valLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-100 rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-gray-100 rounded" />)}
        </div>
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportFilters onFilterChange={setQuery} showExport={false} />

      {/* Summary Cards */}
      {turnover && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary">{tProducts('totalProducts')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-quaternary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turnover.totalProducts}</div>
              <p className="text-xs text-tertiary mt-1">{t('inventoryTab.avgRate', { rate: turnover.averageTurnoverRate.toFixed(2) })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary">{t('inventoryTab.fastMoving')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{turnover.fastMovingCount}</div>
              <p className="text-xs text-tertiary mt-1">{t('inventoryTab.fastMovingDesc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary">{t('inventoryTab.slowMoving')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{turnover.slowMovingCount}</div>
              <p className="text-xs text-tertiary mt-1">{t('inventoryTab.slowMovingDesc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-secondary">{t('inventoryTab.deadStock')}</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{turnover.deadStockCount}</div>
              <p className="text-xs text-tertiary mt-1">{t('inventoryTab.deadStockDesc')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Valor por Almacén */}
      {warehouseValue && warehouseValue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Warehouse className="h-5 w-5" />
              {t('inventoryTab.valueByWarehouse')}
            </CardTitle>
            <CardDescription>{t('inventoryTab.valueByWarehouseDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warehouseValue.map((wh) => (
                <div key={wh.warehouseId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{wh.warehouseName}</p>
                    <p className="text-sm text-tertiary">{t('inventoryTab.warehouseSummary', { products: wh.productCount, units: wh.totalUnits.toLocaleString() })}</p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{formatCOP(wh.totalValue)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Rotación */}
      {turnover && turnover.turnover.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('inventoryTab.turnover')}</CardTitle>
            <CardDescription>
              {t('inventoryTab.turnoverDesc', { rate: turnover.averageTurnoverRate.toFixed(2) })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-tertiary text-xs uppercase">
                    <th className="text-left py-3 px-4">{t('product')}</th>
                    <th className="text-left py-3 px-4">{tProducts('category')}</th>
                    <th className="text-right py-3 px-4">{t('inventoryTab.avgStock')}</th>
                    <th className="text-right py-3 px-4">{t('inventoryTab.sold')}</th>
                    <th className="text-right py-3 px-4">{t('inventoryTab.rotation')}</th>
                    <th className="text-right py-3 px-4">{t('inventoryTab.daysInv')}</th>
                    <th className="text-center py-3 px-4">{tDashboard('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {turnover.turnover.map((item) => {
                    const style = STATUS_STYLES[item.status];
                    return (
                      <tr key={item.productId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-quaternary">{item.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-secondary">{item.category}</td>
                        <td className="py-3 px-4 text-right">{item.averageStock.toFixed(0)}</td>
                        <td className="py-3 px-4 text-right font-medium">{item.totalSold}</td>
                        <td className="py-3 px-4 text-right font-bold">{item.turnoverRate.toFixed(2)}x</td>
                        <td className="py-3 px-4 text-right">
                          {item.daysOfInventory >= 999 ? 'N/A' : t('days', { count: item.daysOfInventory.toFixed(0) })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style ? style.className : 'bg-gray-100 text-secondary'}`}>
                            {style ? t(style.labelKey) : item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
