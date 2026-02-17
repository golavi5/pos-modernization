'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ReportFilters } from './ReportFilters';
import { useInventoryTurnover, useInventoryValueByWarehouse } from '@/hooks/useReports';
import { BarChart3, TrendingUp, AlertTriangle, Warehouse } from 'lucide-react';
import type { ReportQuery } from '@/types/reports';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  'fast-moving': { label: 'Rápido', className: 'bg-green-100 text-green-700' },
  'slow-moving': { label: 'Lento', className: 'bg-orange-100 text-orange-700' },
  'dead-stock': { label: 'Muerto', className: 'bg-red-100 text-red-700' },
};

export function InventoryReportTab() {
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
              <CardTitle className="text-sm font-medium text-gray-600">Total Productos</CardTitle>
              <BarChart3 className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{turnover.totalProducts}</div>
              <p className="text-xs text-gray-500 mt-1">Tasa prom: {turnover.averageTurnoverRate.toFixed(2)}x</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Movimiento Rápido</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{turnover.fastMovingCount}</div>
              <p className="text-xs text-gray-500 mt-1">Rotación ≥ 4x</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Movimiento Lento</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{turnover.slowMovingCount}</div>
              <p className="text-xs text-gray-500 mt-1">Rotación 1-4x</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Stock Muerto</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{turnover.deadStockCount}</div>
              <p className="text-xs text-gray-500 mt-1">Rotación &lt; 1x</p>
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
              Valor de Inventario por Almacén
            </CardTitle>
            <CardDescription>Valoración total del stock en cada ubicación</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {warehouseValue.map((wh) => (
                <div key={wh.warehouseId} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-semibold">{wh.warehouseName}</p>
                    <p className="text-sm text-gray-500">{wh.productCount} productos · {wh.totalUnits.toLocaleString()} unidades</p>
                  </div>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(wh.totalValue)}</p>
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
            <CardTitle>Rotación de Inventario</CardTitle>
            <CardDescription>
              Análisis de movimiento de productos · Tasa promedio: {turnover.averageTurnoverRate.toFixed(2)}x
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-xs uppercase">
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-left py-3 px-4">Categoría</th>
                    <th className="text-right py-3 px-4">Stock Prom.</th>
                    <th className="text-right py-3 px-4">Vendido</th>
                    <th className="text-right py-3 px-4">Rotación</th>
                    <th className="text-right py-3 px-4">Días Inv.</th>
                    <th className="text-center py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {turnover.turnover.map((item) => {
                    const style = STATUS_STYLES[item.status] || { label: item.status, className: 'bg-gray-100 text-gray-700' };
                    return (
                      <tr key={item.productId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-gray-400">{item.sku}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{item.category}</td>
                        <td className="py-3 px-4 text-right">{item.averageStock.toFixed(0)}</td>
                        <td className="py-3 px-4 text-right font-medium">{item.totalSold}</td>
                        <td className="py-3 px-4 text-right font-bold">{item.turnoverRate.toFixed(2)}x</td>
                        <td className="py-3 px-4 text-right">
                          {item.daysOfInventory >= 999 ? 'N/A' : `${item.daysOfInventory.toFixed(0)} días`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${style.className}`}>
                            {style.label}
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
