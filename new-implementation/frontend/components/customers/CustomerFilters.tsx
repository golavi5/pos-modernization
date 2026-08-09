'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CustomerQueryParams } from '@/types/customer';

interface CustomerFiltersProps {
  onFilterChange: (filters: CustomerQueryParams) => void;
}

export function CustomerFilters({ onFilterChange }: CustomerFiltersProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const tProducts = useTranslations('products');
  const tDashboard = useTranslations('dashboard');
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [minLoyaltyPoints, setMinLoyaltyPoints] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<CustomerQueryParams['sortBy']>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    onFilterChange({
      search: search || undefined,
      isActive,
      minLoyaltyPoints,
      sortBy,
      sortOrder,
    });
  };

  const handleReset = () => {
    setSearch('');
    setIsActive(undefined);
    setMinLoyaltyPoints(undefined);
    setSortBy('created_at');
    setSortOrder('DESC');
    onFilterChange({});
  };

  const hasActiveFilters =
    search || isActive !== undefined || minLoyaltyPoints !== undefined || sortBy !== 'created_at';

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
      {/* Búsqueda principal */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-quaternary" />
          <Input
            type="text"
            placeholder={t('filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10"
          />
        </div>
        <Button onClick={handleSearch}>{tCommon('search')}</Button>
        {hasActiveFilters && (
          <Button variant="outline" onClick={handleReset}>
            <X className="w-4 h-4 mr-2" />
            {tCommon('clear')}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? 'bg-gray-100' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          {tProducts('filters')}
        </Button>
      </div>

      {/* Filtros avanzados */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {tDashboard('status')}
            </label>
            <select
              value={isActive === undefined ? '' : isActive ? 'true' : 'false'}
              onChange={(e) =>
                setIsActive(
                  e.target.value === '' ? undefined : e.target.value === 'true'
                )
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{tProducts('allStatus')}</option>
              <option value="true">{tCommon('active')}</option>
              <option value="false">{tCommon('inactive')}</option>
            </select>
          </div>

          {/* Puntos mínimos */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {t('filters.minPoints')}
            </label>
            <Input
              type="number"
              min="0"
              value={minLoyaltyPoints || ''}
              onChange={(e) =>
                setMinLoyaltyPoints(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              placeholder="0"
            />
          </div>

          {/* Ordenar por */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {tProducts('sortBy')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CustomerQueryParams['sortBy'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">{t('filters.registrationDate')}</option>
              <option value="name">{tProducts('name')}</option>
              <option value="total_purchases">{t('filters.totalPurchases')}</option>
              <option value="loyalty_points">{t('filters.loyaltyPoints')}</option>
            </select>
          </div>

          {/* Orden */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              {tProducts('order')}
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ASC">{tProducts('ascending')}</option>
              <option value="DESC">{tProducts('descending')}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
