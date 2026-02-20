'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StockQueryParams, Warehouse } from '@/types/inventory';

interface InventoryFiltersProps {
  onFilterChange: (filters: StockQueryParams) => void;
  warehouses?: Warehouse[];
}

export function InventoryFilters({ onFilterChange, warehouses = [] }: InventoryFiltersProps) {
  const [warehouseId, setWarehouseId] = useState<string>('');
  const [lowStock, setLowStock] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<StockQueryParams['sortBy']>('product_name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleApply = () => {
    onFilterChange({
      warehouse_id: warehouseId || undefined,
      low_stock: lowStock,
      sortBy,
      sortOrder,
    });
  };

  const handleReset = () => {
    setWarehouseId('');
    setLowStock(undefined);
    setSortBy('product_name');
    setSortOrder('ASC');
    onFilterChange({});
  };

  const hasActiveFilters = warehouseId || lowStock !== undefined || sortBy !== 'product_name';

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      {/* Main filters */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? 'bg-gray-100' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleReset}>
            <X className="w-4 h-4 mr-2" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          {/* Warehouse */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Almacén
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos los almacenes</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stock level */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Nivel de stock
            </label>
            <select
              value={lowStock === undefined ? '' : lowStock ? 'true' : 'false'}
              onChange={(e) =>
                setLowStock(
                  e.target.value === '' ? undefined : e.target.value === 'true'
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              <option value="true">Stock bajo</option>
              <option value="false">Stock normal</option>
            </select>
          </div>

          {/* Sort by */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Ordenar por
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as StockQueryParams['sortBy'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="product_name">Nombre del producto</option>
              <option value="quantity">Cantidad</option>
              <option value="last_movement_date">Último movimiento</option>
            </select>
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Orden
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ASC">Ascendente</option>
              <option value="DESC">Descendente</option>
            </select>
          </div>
        </div>
      )}

      {/* Apply button */}
      {showAdvanced && (
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={handleApply}>Aplicar filtros</Button>
        </div>
      )}
    </div>
  );
}
