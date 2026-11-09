'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StockLevel, MovementType } from '@/types/inventory';
import { MovementTypePicker } from './MovementTypePicker';
import { StockPreview } from './StockPreview';

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  stock: StockLevel | null;
  onConfirm: (
    movementType: MovementType,
    quantity: number,
    referenceId?: string,
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
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState<number>(0);
  const [referenceId, setReferenceId] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !stock) return null;

  const isDecrement = movementType === 'OUT' || movementType === 'ADJUST' || movementType === 'DAMAGE';
  const exceedsStock = isDecrement && quantity > stock.quantity;

  const handleConfirm = () => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      alert(t('adjust.invalidQuantity'));
      return;
    }

    if (exceedsStock) {
      alert(t('adjust.insufficientStock'));
      return;
    }

    onConfirm(
      movementType,
      quantity,
      referenceId || undefined,
      notes || undefined
    );

    // Reset form
    setQuantity(0);
    setReferenceId('');
    setNotes('');
  };

  const getNewQuantity = () =>
    isDecrement ? stock.quantity - quantity : stock.quantity + quantity;

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
            <div className="mt-3 text-sm">
              <span className="text-secondary">{t('adjust.currentStock')}:</span>
              <span className="ml-2 font-bold ">{stock.quantity}</span>
            </div>
          </div>

          <MovementTypePicker value={movementType} onChange={setMovementType} />

          {/* Quantity input */}
          <div>
            <Label htmlFor="quantity">
              {tCommon('quantity')}
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              step="1"
              value={quantity || ''}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            {exceedsStock && (
              <p className="text-sm text-red-600 mt-1">
                {t('adjust.exceedsStock', { available: stock.quantity })}
              </p>
            )}
          </div>

          {/* Reference number */}
          <div>
            <Label htmlFor="reference">{t('adjust.reference')}</Label>
            <Input
              id="reference"
              type="text"
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
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

          {quantity > 0 && (
            <StockPreview
              current={stock.quantity}
              quantity={quantity}
              isIncrement={!isDecrement}
              next={getNewQuantity()}
            />
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
            disabled={isLoading || quantity <= 0 || exceedsStock}
            className="flex-1"
          >
            {isLoading ? tCommon('processing') : t('adjust.confirmAdjust')}
          </Button>
        </div>
      </div>
    </div>
  );
}
