'use client';

import { Pencil, Trash2, Eye, Award } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCustomers } from '@/hooks/useCustomers';
import { formatCOP } from '@/lib/utils';
import type { Customer } from '@/types/customer';

interface CustomersTableProps {
  /** If provided, the component owns its own data fetch filtered by search */
  search?: string;
  /** Legacy: pass data directly */
  customers?: Customer[];
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  onView?: (customer: Customer) => void;
  onManageLoyalty?: (customer: Customer) => void;
  isLoading?: boolean;
}

export function CustomersTable({
  search,
  customers: customersProp,
  onEdit,
  onDelete,
  onView,
  onManageLoyalty,
  isLoading: isLoadingProp,
}: CustomersTableProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const tReports = useTranslations('reports');
  const queryEnabled = search !== undefined;
  const { data: customersData, isLoading: isLoadingQuery } = useCustomers(
    queryEnabled ? { search: search || undefined, page: 1, pageSize: 50 } : {}
  );
  const customers = queryEnabled ? (customersData?.data ?? []) : (customersProp ?? []);
  const isLoading = isLoadingProp ?? (queryEnabled ? isLoadingQuery : false);
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
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

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-tertiary text-lg">{t('table.empty')}</p>
        <p className="text-quaternary text-sm mt-2">
          {t('table.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left p-4 font-semibold text-secondary">{tCommon('customer')}</th>
            <th className="text-left p-4 font-semibold text-secondary">{tCommon('contact')}</th>
            <th className="text-right p-4 font-semibold text-secondary">{tCommon('purchases')}</th>
            <th className="text-center p-4 font-semibold text-secondary">{tCommon('points')}</th>
            <th className="text-center p-4 font-semibold text-secondary">{t('table.lastPurchase')}</th>
            <th className="text-center p-4 font-semibold text-secondary">{tCommon('status')}</th>
            <th className="text-center p-4 font-semibold text-secondary">{tCommon('actions')}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="p-4">
                <div>
                  <div className="font-medium">{customer.name}</div>
                  {customer.address && (
                    <div className="text-sm text-tertiary truncate max-w-xs">
                      {customer.address}
                    </div>
                  )}
                </div>
              </td>
              <td className="p-4">
                <div className="text-sm">
                  {customer.email && (
                    <div className="text-secondary">{customer.email}</div>
                  )}
                  {customer.phone && (
                    <div className="text-tertiary">{customer.phone}</div>
                  )}
                  {!customer.email && !customer.phone && (
                    <div className="text-quaternary">-</div>
                  )}
                </div>
              </td>
              <td className="p-4 text-right">
                <div>
                  <div className="font-semibold">
                    {formatCOP(customer.total_purchases)}
                  </div>
                  <div className="text-sm text-tertiary">{tCommon('total')}</div>
                </div>
              </td>
              <td className="p-4 text-center">
                <div className="inline-flex items-center gap-1">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold">
                    {customer.loyalty_points}
                  </span>
                </div>
              </td>
              <td className="p-4 text-center">
                <span className="text-sm text-secondary">
                  {formatDate(customer.last_purchase_date)}
                </span>
              </td>
              <td className="p-4 text-center">
                {customer.is_active ? (
                  <Badge variant="success">{tCommon('statusActive')}</Badge>
                ) : (
                  <Badge variant="secondary">{tCommon('statusInactive')}</Badge>
                )}
              </td>
              <td className="p-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView?.(customer)}
                    title={t('table.viewDetails')}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageLoyalty?.(customer)}
                    title={t('table.managePoints')}
                    className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                  >
                    <Award className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit?.(customer)}
                    title={tCommon('edit')}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete?.(customer)}
                    title={tCommon('delete')}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
