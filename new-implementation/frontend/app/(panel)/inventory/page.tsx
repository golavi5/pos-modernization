'use client';

import { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertTriangle, Warehouse as WarehouseIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StockTable } from '@/components/inventory/StockTable';
import { StockMovements } from '@/components/inventory/StockMovements';
import { AdjustStockModal } from '@/components/inventory/AdjustStockModal';
import { InventoryFilters } from '@/components/inventory/InventoryFilters';
import { useToolbar } from '@/components/layout/ToolbarContext';
import {
  useStock,
  useMovements,
  useWarehouses,
  useInventoryStats,
  useAdjustStock,
} from '@/hooks/useInventory';
import type { StockLevel, StockQueryParams, MovementQueryParams } from '@/types/inventory';

export default function InventoryPage() {
  const { setToolbar } = useToolbar();
  const [stockParams, setStockParams] = useState<StockQueryParams>({
    page: 1,
    pageSize: 20,
  });
  const [movementParams, setMovementParams] = useState<MovementQueryParams>({
    page: 1,
    pageSize: 10,
  });
  const [adjustingStock, setAdjustingStock] = useState<StockLevel | null>(null);
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');

  // Set toolbar config
  useEffect(() => {
    setToolbar({ title: 'Inventario' });
  }, [setToolbar]);

  // Queries
  const { data: stockData, isLoading: stockLoading } = useStock(stockParams);
  const { data: movementsData, isLoading: movementsLoading } = useMovements(movementParams);
  const { data: warehouses } = useWarehouses();
  const { data: stats } = useInventoryStats();

  // Mutations
  const adjustStockMutation = useAdjustStock();

  const handleFilterChange = (filters: StockQueryParams) => {
    setStockParams({ ...filters, page: 1, pageSize: 20 });
  };

  const handleAdjustStock = (stock: StockLevel) => {
    setAdjustingStock(stock);
  };

  const handleConfirmAdjust = async (
    movementType: 'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'RETURN',
    quantity: number,
    referenceNumber?: string,
    notes?: string
  ) => {
    if (!adjustingStock) return;

    try {
      await adjustStockMutation.mutateAsync({
        product_id: adjustingStock.product_id,
        warehouse_id: adjustingStock.warehouse_id,
        location_id: adjustingStock.location_id,
        movement_type: movementType,
        quantity,
        reference_number: referenceNumber,
        notes,
      });

      alert('Stock ajustado exitosamente');
      setAdjustingStock(null);
    } catch (error) {
      alert('Error al ajustar el stock');
      console.error(error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Inventario</h1>
        <p className="text-tertiary mt-1">Gestiona tu stock y movimientos de inventario</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">Total Productos</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalProducts}
                </p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
            <p className="text-sm text-tertiary mt-4">
              En inventario
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">Stock Total</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalStock.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-sm text-tertiary mt-4">
              Unidades en stock
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">Stock Bajo</p>
                <p className="text-2xl font-bold text-yellow-600 mt-1">
                  {stats.lowStockItems}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-yellow-500" />
            </div>
            <p className="text-sm text-tertiary mt-4">
              Requieren reabastecimiento
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">Almacenes</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalWarehouses}
                </p>
              </div>
              <WarehouseIcon className="w-10 h-10 text-purple-500" />
            </div>
            <p className="text-sm text-tertiary mt-4">
              Activos
            </p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('stock')}
            className={`
              pb-4 border-b-2 font-medium transition-colors
              ${
                activeTab === 'stock'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-tertiary hover:text-secondary'
              }
            `}
          >
            Stock Actual
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`
              pb-4 border-b-2 font-medium transition-colors
              ${
                activeTab === 'movements'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-tertiary hover:text-secondary'
              }
            `}
          >
            Movimientos
            {movementsData && movementsData.total > 0 && (
              <Badge variant="default" className="ml-2">
                {movementsData.total}
              </Badge>
            )}
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'stock' && (
        <>
          {/* Filters */}
          <InventoryFilters
            onFilterChange={handleFilterChange}
            warehouses={warehouses || []}
          />

          {/* Stock Table */}
          <Card className="overflow-hidden">
            <StockTable
              stock={stockData?.data || []}
              onAdjust={handleAdjustStock}
              isLoading={stockLoading}
            />

            {/* Pagination */}
            {stockData && stockData.total > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-tertiary">
                  Mostrando {((stockData.page - 1) * stockData.pageSize) + 1} -{' '}
                  {Math.min(stockData.page * stockData.pageSize, stockData.total)}{' '}
                  de {stockData.total} productos
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setStockParams((prev) => ({ ...prev, page: prev.page! - 1 }))
                    }
                    disabled={stockData.page === 1}
                    className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setStockParams((prev) => ({ ...prev, page: prev.page! + 1 }))
                    }
                    disabled={
                      stockData.page >= Math.ceil(stockData.total / stockData.pageSize)
                    }
                    className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {activeTab === 'movements' && (
        <>
          {/* Movements List */}
          <Card className="p-6">
            <StockMovements
              movements={movementsData?.data || []}
              isLoading={movementsLoading}
            />

            {/* Pagination */}
            {movementsData && movementsData.total > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-tertiary">
                  Mostrando {((movementsData.page - 1) * movementsData.pageSize) + 1} -{' '}
                  {Math.min(
                    movementsData.page * movementsData.pageSize,
                    movementsData.total
                  )}{' '}
                  de {movementsData.total} movimientos
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setMovementParams((prev) => ({ ...prev, page: prev.page! - 1 }))
                    }
                    disabled={movementsData.page === 1}
                    className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setMovementParams((prev) => ({ ...prev, page: prev.page! + 1 }))
                    }
                    disabled={
                      movementsData.page >=
                      Math.ceil(movementsData.total / movementsData.pageSize)
                    }
                    className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Adjust Stock Modal */}
      <AdjustStockModal
        isOpen={!!adjustingStock}
        onClose={() => setAdjustingStock(null)}
        stock={adjustingStock}
        onConfirm={handleConfirmAdjust}
        isLoading={adjustStockMutation.isPending}
      />
    </div>
  );
}
