'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ProductQueryParams } from '@/types/product';

interface ProductFiltersProps {
  onFilterChange: (filters: ProductQueryParams) => void;
  categories?: string[];
}

export function ProductFilters({ onFilterChange, categories = [] }: ProductFiltersProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
  const [sortBy, setSortBy] = useState<ProductQueryParams['sortBy']>('created_at');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSearch = () => {
    onFilterChange({
      search: search || undefined,
      category: category || undefined,
      isActive,
      sortBy,
      sortOrder,
    });
  };

  const handleReset = () => {
    setSearch('');
    setCategory('');
    setIsActive(undefined);
    setSortBy('created_at');
    setSortOrder('DESC');
    onFilterChange({});
  };

  const hasActiveFilters =
    search || category || isActive !== undefined || sortBy !== 'created_at';

  return (
    <div className="bg-surface-1 p-4 rounded-lg border space-y-4">
      {/* Main search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-tertiary" />
          <Input
            type="text"
            placeholder={t('searchPlaceholder')}
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
          className={showAdvanced ? 'bg-hover-bg' : ''}
        >
          <Filter className="w-4 h-4 mr-2" />
          {t('filters')}
        </Button>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-tertiary mb-2">
              {t('category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-tertiary mb-2">
              {t('status')}
            </label>
            <select
              value={isActive === undefined ? '' : isActive ? 'true' : 'false'}
              onChange={(e) =>
                setIsActive(
                  e.target.value === '' ? undefined : e.target.value === 'true'
                )
              }
              className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">{t('allStatus')}</option>
              <option value="true">{tCommon('active')}</option>
              <option value="false">{tCommon('inactive')}</option>
            </select>
          </div>

          {/* Sort by */}
          <div>
            <label className="block text-sm font-medium text-tertiary mb-2">
              {t('sortBy')}
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ProductQueryParams['sortBy'])}
              className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="created_at">{t('creationDate')}</option>
              <option value="name">{t('name')}</option>
              <option value="price">{t('price')}</option>
              <option value="stock_quantity">{t('stock')}</option>
            </select>
          </div>

          {/* Order */}
          <div>
            <label className="block text-sm font-medium text-tertiary mb-2">
              {t('order')}
            </label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'ASC' | 'DESC')}
              className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ASC">{t('ascending')}</option>
              <option value="DESC">{t('descending')}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
