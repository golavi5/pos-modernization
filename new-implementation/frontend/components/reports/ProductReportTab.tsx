'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ReportFilters } from './ReportFilters';
import { useTopSellingProducts, useLowStockProducts } from '@/hooks/useReports';
import { reportsApi } from '@/lib/api/reports';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import type { ReportQuery, ExportFormat } from '@/types/reports';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);

export function ProductReportTab() {
  const [query, setQuery] = useState<ReportQuery>({ period: 'monthly', limit: 10 });

  const { data: topSelling, isLoading: topLoading } = useTopSellingProducts(query);
  const { data: lowStock, isLoading: lowLoading } = useLowStockProducts(query);

  const handleExport = (format: ExportFormat) => {
    window.open(reportsApi.exportProductReport({ ...query, format }), '_blank');
  };

  if (topLoading || lowLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gray-100 rounded" />
        <div className="h-64 bg-gray-100 rounded" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReportFilters onFilterChange={setQuery} onExport={handleExport} />

      {/* Top Selling Products */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Productos Más Vendidos
          </CardTitle>
          <CardDescription>Los {topSelling?.length ?? 0} productos con mejor desempeño en el período</CardDescription>
        </CardHeader>
        <CardContent>
          {topSelling && topSelling.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-tertiary text-xs uppercase">
                    <th className="text-left py-3 px-4">#</th>
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-left py-3 px-4">Categoría</th>
                    <th className="text-right py-3 px-4">Cantidad</th>
                    <th className="text-right py-3 px-4">Ingresos</th>
                    <th className="text-right py-3 px-4">Precio Prom.</th>
                  </tr>
                </thead>
                <tbody>
                  {topSelling.map((product, i) => (
                    <tr key={product.productId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-quaternary font-medium">{i + 1}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-xs text-quaternary">{product.sku}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-secondary">{product.category}</td>
                      <td className="py-3 px-4 text-right font-medium">{product.totalQuantitySold}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(product.totalRevenue)}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(product.averagePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-tertiary py-8">No hay datos de ventas disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alertas de Stock Bajo
          </CardTitle>
          <CardDescription>Productos que necesitan reabastecimiento urgente</CardDescription>
        </CardHeader>
        <CardContent>
          {lowStock && lowStock.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-tertiary text-xs uppercase">
                    <th className="text-left py-3 px-4">Producto</th>
                    <th className="text-left py-3 px-4">Almacén</th>
                    <th className="text-right py-3 px-4">Stock Actual</th>
                    <th className="text-right py-3 px-4">Punto Reorden</th>
                    <th className="text-center py-3 px-4">Estado</th>
                    <th className="text-right py-3 px-4">Días Restantes</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((product) => (
                    <tr key={`${product.productId}-${product.warehouseName}`} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-xs text-quaternary">{product.sku}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-secondary">{product.warehouseName}</td>
                      <td className="py-3 px-4 text-right font-bold text-red-600">{product.currentStock}</td>
                      <td className="py-3 px-4 text-right text-secondary">{product.reorderPoint}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.stockLevel === 'critical'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {product.stockLevel === 'critical' ? '⚠️ Crítico' : '⚠️ Bajo'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-secondary">
                        {product.daysUntilStockout !== undefined ? `${product.daysUntilStockout} días` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-tertiary py-8">
              ✅ Todos los productos tienen stock suficiente
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
