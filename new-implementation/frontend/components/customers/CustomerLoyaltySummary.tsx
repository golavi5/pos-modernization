'use client';

import { useTranslations } from 'next-intl';
import { formatCOP } from '@/lib/utils';
import type { Customer } from '@/types/customer';

export function CustomerLoyaltySummary({ customer }: { customer: Customer }) {
  const t = useTranslations('customers');

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h4 className="font-semibold text-blue-900 mb-2">{t('additionalInfo')}</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-blue-700">{t('loyaltyPoints')}</span>
          <span className="ml-2 font-semibold text-blue-900">{customer.loyalty_points}</span>
        </div>
        <div>
          <span className="text-blue-700">{t('totalPurchases')}</span>
          <span className="ml-2 font-semibold text-blue-900">
            {formatCOP(customer.total_purchases)}
          </span>
        </div>
      </div>
      <p className="text-xs text-blue-600 mt-2">{t('pointsNote')}</p>
    </div>
  );
}
