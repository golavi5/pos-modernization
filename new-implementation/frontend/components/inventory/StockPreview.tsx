'use client';

import { useTranslations } from 'next-intl';

interface StockPreviewProps {
  current: number;
  quantity: number;
  isIncrement: boolean;
  next: number;
}

export function StockPreview({ current, quantity, isIncrement, next }: StockPreviewProps) {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');

  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <p className="text-sm text-blue-700 mb-2">{tCommon('preview')}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm text-blue-600">{t('adjust.currentStock')}:</span>
        <span className="font-semibold text-blue-900">{current}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-sm text-blue-600">
          {isIncrement ? t('adjust.addLabel') : tCommon('subtractLabel')}
        </span>
        <span className={`font-semibold ${isIncrement ? 'text-green-600' : 'text-red-600'}`}>
          {isIncrement ? '+' : '-'}
          {quantity}
        </span>
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-300">
        <span className="text-sm font-semibold text-blue-700">{t('adjust.newStock')}:</span>
        <span className="text-xl font-bold text-blue-900">{next}</span>
      </div>
    </div>
  );
}
