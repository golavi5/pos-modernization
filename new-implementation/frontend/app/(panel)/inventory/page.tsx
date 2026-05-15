'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StockTable } from '@/components/inventory/StockTable';
import { StockMovements } from '@/components/inventory/StockMovements';
import { AdjustStockModal } from '@/components/inventory/AdjustStockModal';
import {
  useMovements,
  useAdjustStock,
} from '@/hooks/useInventory';
import type { StockLevel, MovementQueryParams } from '@/types/inventory';

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [movementParams, setMovementParams] = useState<MovementQueryParams>({
    page: 1,
    pageSize: 10,
  });
  const [adjustingStock, setAdjustingStock] = useState<StockLevel | null>(null);
  const [activeTab, setActiveTab] = useState<'stock' | 'movements'>('stock');

  const { data: movementsData, isLoading: movementsLoading } = useMovements(movementParams);
  const adjustStockMutation = useAdjustStock();

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
      setAdjustingStock(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto o SKU..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />

        {/* Tabs inline with toolbar */}
        <div className="flex border rounded-md overflow-hidden text-sm">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 font-medium transition-colors ${
              activeTab === 'stock'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Stock
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'movements'
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-muted'
            }`}
          >
            Movimientos
            {movementsData && movementsData.total > 0 && (
              <Badge variant="default" className="text-xs px-1 py-0">
                {movementsData.total}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'stock' && (
          <StockTable
            search={search}
            onAdjust={setAdjustingStock}
          />
        )}

        {activeTab === 'movements' && (
          <>
            <StockMovements
              movements={movementsData?.data || []}
              isLoading={movementsLoading}
            />
            {movementsData && movementsData.total > 0 && (
              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Mostrando {((movementsData.page - 1) * movementsData.pageSize) + 1}–
                  {Math.min(movementsData.page * movementsData.pageSize, movementsData.total)}{' '}
                  de {movementsData.total} movimientos
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setMovementParams((prev) => ({ ...prev, page: prev.page! - 1 }))
                    }
                    disabled={movementsData.page === 1}
                    className="px-3 py-1 border rounded text-sm hover:bg-muted disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() =>
                      setMovementParams((prev) => ({ ...prev, page: prev.page! + 1 }))
                    }
                    disabled={
                      movementsData.page >= Math.ceil(movementsData.total / movementsData.pageSize)
                    }
                    className="px-3 py-1 border rounded text-sm hover:bg-muted disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

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
