'use client';

import { Package, AlertTriangle, ArrowUpCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { StockLevel } from '@/types/inventory';

interface StockTableProps {
  stock: StockLevel[];
  onAdjust: (stock: StockLevel) => void;
  isLoading?: boolean;
}

export function StockTable({ stock, onAdjust, isLoading }: StockTableProps) {
  const getStockStatus = (item: StockLevel) => {
    if (item.quantity === 0) {
      return { label: 'Sin stock', variant: 'error' as const, icon: AlertTriangle };
    }
    if (item.reorder_point && item.quantity <= item.reorder_point) {
      return { label: 'Reabastecer', variant: 'warning' as const, icon: AlertTriangle };
    }
    if (item.min_stock_level && item.quantity <= item.min_stock_level) {
      return { label: 'Stock bajo', variant: 'warning' as const, icon: AlertTriangle };
    }
    return { label: 'Disponible', variant: 'success' as const, icon: Package };
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (stock.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">No hay stock disponible</p>
        <p className="text-gray-400 text-sm mt-2">
          Ajusta filtros o agrega productos al inventario
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left p-4 font-semibold text-gray-700">Producto</th>
            <th className="text-left p-4 font-semibold text-gray-700">Almacén</th>
            <th className="text-center p-4 font-semibold text-gray-700">Cantidad</th>
            <th className="text-center p-4 font-semibold text-gray-700">Reservado</th>
            <th className="text-center p-4 font-semibold text-gray-700">Disponible</th>
            <th className="text-center p-4 font-semibold text-gray-700">Estado</th>
            <th className="text-center p-4 font-semibold text-gray-700">Acción</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((item) => {
            const status = getStockStatus(item);
            const StatusIcon = status.icon;
            
            return (
              <tr
                key={item.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="p-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {item.product_name || 'Producto sin nombre'}
                    </div>
                    {item.product_sku && (
                      <div className="text-sm text-gray-500 font-mono">
                        SKU: {item.product_sku}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div>
                    <div className="text-gray-900">{item.warehouse_name}</div>
                    {item.location_name && (
                      <div className="text-sm text-gray-500">{item.location_name}</div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center">
                  <div className="font-semibold text-gray-900 text-lg">
                    {item.quantity}
                  </div>
                  {item.min_stock_level && (
                    <div className="text-xs text-gray-500">
                      Min: {item.min_stock_level}
                    </div>
                  )}
                </td>
                <td className="p-4 text-center">
                  <span className="text-gray-700">{item.reserved_quantity}</span>
                </td>
                <td className="p-4 text-center">
                  <span className="font-semibold text-green-600">
                    {item.available_quantity}
                  </span>
                </td>
                <td className="p-4 text-center">
                  <Badge variant={status.variant} className="inline-flex items-center gap-1">
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                </td>
                <td className="p-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAdjust(item)}
                    title="Ajustar stock"
                  >
                    <ArrowUpCircle className="w-4 h-4 mr-1" />
                    Ajustar
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
