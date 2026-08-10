'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, ArrowUpCircle, ArrowDownCircle, Edit3, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StockLevel } from '@/types/inventory';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockLevel | null;
  onConfirm: (
    movementType: 'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'RETURN',
    quantity: number,
    referenceNumber?: string,
    notes?: string
  ) => void;
  isLoading?: boolean;
}

export function AdjustStockModal({
  isOpen,
  onClose,
  stock,
  onConfirm,
  isLoading,
}: AdjustStockModalProps) {
  const t = useTranslations('inventory');
  const tCommon = useTranslations('common');
  const tSales = useTranslations('sales');
  const tProducts = useTranslations('products');
  const tReports = useTranslations('reports');
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'RETURN'>('IN');
  const [quantity, setQuantity] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !stock) return null;

  const handleConfirm = () => {
    if (quantity <= 0) {
      alert(t('adjust.invalidQuantity'));
      return;
    }

    if (movementType === 'OUT' && quantity > stock.available_quantity) {
      alert(t('adjust.insufficientStock'));
      return;
    }

    onConfirm(
      movementType,
      quantity,
      referenceNumber || undefined,
      notes || undefined
    );

    // Reset form
    setQuantity(0);
    setReferenceNumber('');
    setNotes('');
  };

  const getNewQuantity = () => {
    switch (movementType) {
      case 'IN':
      case 'RETURN':
        return stock.quantity + quantity;
      case 'OUT':
      case 'DAMAGE':
        return stock.quantity - quantity;
      case 'ADJUST':
        return quantity;
      default:
        return stock.quantity;
    }
  };

  const movementTypes = [
    {
      id: 'IN' as const,
      label: t('movementTypes.IN'),
      icon: ArrowUpCircle,
      color: 'green',
      description: t('movementDesc.IN'),
    },
    {
      id: 'OUT' as const,
      label: t('movementTypes.OUT'),
      icon: ArrowDownCircle,
      color: 'red',
      description: t('movementDesc.OUT'),
    },
    {
      id: 'ADJUST' as const,
      label: t('movementTypes.ADJUST'),
      icon: Edit3,
      color: 'blue',
      description: t('movementDesc.ADJUST'),
    },
    {
      id: 'DAMAGE' as const,
      label: t('movementTypes.DAMAGE'),
      icon: AlertCircle,
      color: 'orange',
      description: t('movementDesc.DAMAGE'),
    },
    {
      id: 'RETURN' as const,
      label: t('movementTypes.RETURN'),
      icon: RotateCcw,
      color: 'indigo',
      description: t('movementDesc.RETURN'),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold ">{t('adjust.title')}</h2>
          <button
            onClick={onClose}
            className="text-quaternary hover:text-secondary transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Product info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-secondary mb-1">{tCommon('product')}</p>
            <p className="text-lg font-semibold ">{stock.product_name}</p>
            {stock.product_sku && (
              <p className="text-sm text-tertiary font-mono">SKU: {stock.product_sku}</p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-secondary">{t('adjust.currentStock')}:</span>
                <span className="ml-2 font-bold ">{stock.quantity}</span>
              </div>
              <div>
                <span className="text-secondary">{t('table.reserved')}:</span>
                <span className="ml-2 font-bold ">{stock.reserved_quantity}</span>
              </div>
              <div>
                <span className="text-secondary">{t('table.available')}:</span>
                <span className="ml-2 font-bold text-green-600">{stock.available_quantity}</span>
              </div>
            </div>
          </div>

          {/* Movement type selection */}
          <div>
            <Label className="mb-3">{t('adjust.movementType')}</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {movementTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = movementType === type.id;
                return (
                  <button
                    key={type.id}
                    onClick={() => setMovementType(type.id)}
                    className={`
                      p-3 rounded-lg border-2 transition-all text-left
                      ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 mb-2 ${
                        isSelected ? 'text-blue-600' : 'text-quaternary'
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? 'text-blue-900' : 'text-secondary'
                      }`}
                    >
                      {type.label}
                    </p>
                    <p className="text-xs text-tertiary mt-1">
                      {type.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity input */}
          <div>
            <Label htmlFor="quantity">
              {movementType === 'ADJUST' ? t('adjust.newQuantity') : tCommon('quantity')}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="0"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            {movementType === 'OUT' && quantity > stock.available_quantity && (
              <p className="text-sm text-red-600 mt-1">
                {t('adjust.exceedsStock', { available: stock.available_quantity })}
              </p>
            )}
          </div>

          {/* Reference number */}
          <div>
            <Label htmlFor="reference">{t('adjust.reference')}</Label>
            <Input
              id="reference"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={t('adjust.referencePlaceholder')}
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">{tCommon('notesOptional')}</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('adjust.notesPlaceholder')}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview */}
          {quantity > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-2">{tCommon('preview')}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600">{t('adjust.currentStock')}:</span>
                <span className="font-semibold text-blue-900">{stock.quantity}</span>
              </div>
              {movementType !== 'ADJUST' && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-blue-600">
                    {['IN', 'RETURN'].includes(movementType) ? t('adjust.addLabel') : tCommon('subtractLabel')}
                  </span>
                  <span
                    className={`font-semibold ${
                      ['IN', 'RETURN'].includes(movementType)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {['IN', 'RETURN'].includes(movementType) ? '+' : '-'}
                    {quantity}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-300">
                <span className="text-sm font-semibold text-blue-700">{t('adjust.newStock')}:</span>
                <span className="text-xl font-bold text-blue-900">{getNewQuantity()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {tCommon('cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || quantity <= 0}
            className="flex-1"
          >
            {isLoading ? tCommon('processing') : t('adjust.confirmAdjust')}
          </Button>
        </div>
      </div>
    </div>
  );
}
