'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StockQueryParams } from '@/types/inventory';

interface InventoryFiltersProps {
  onFilterChange: (filters: StockQueryParams) => void;
}

export function InventoryFilters({ onFilterChange }: InventoryFiltersProps) {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const tProducts = useTranslations('products');
  const tNotifications = useTranslations('notifications');
  const [lowStock, setLowStock] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleApply = () => {
    onFilterChange({ low_stock: lowStock || undefined });
  };

  const handleReset = () => {
    setLowStock(false);
    onFilterChange({});
  };

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
          {tProducts('filters')}
        </Button>
        {lowStock && (
          <Button variant="outline" onClick={handleReset}>
            <X className="w-4 h-4 mr-2" />
            {tCommon('clear')}
          </Button>
        )}
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <>
          <div className="pt-4 border-t max-w-xs">
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('filters.stockLevel')}
            </label>
            <select
              value={lowStock ? 'true' : ''}
              onChange={(e) => setLowStock(e.target.value === 'true')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{tProducts('allStatus')}</option>
              <option value="true">{tNotifications('types.lowStock')}</option>
            </select>
          </div>
          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleApply}>{t('filters.applyFilters')}</Button>
          </div>
        </>
      )}
    </div>
  );
}
