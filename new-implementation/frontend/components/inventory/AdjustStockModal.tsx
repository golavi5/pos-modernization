'use client';

import { useState } from 'react';
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
  const [movementType, setMovementType] = useState<'IN' | 'OUT' | 'ADJUST' | 'DAMAGE' | 'RETURN'>('IN');
  const [quantity, setQuantity] = useState<number>(0);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen || !stock) return null;

  const handleConfirm = () => {
    if (quantity <= 0) {
      alert('Ingresa una cantidad válida');
      return;
    }

    if (movementType === 'OUT' && quantity > stock.available_quantity) {
      alert('No hay suficiente stock disponible');
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
      label: 'Entrada',
      icon: ArrowUpCircle,
      color: 'green',
      description: 'Recibir stock',
    },
    {
      id: 'OUT' as const,
      label: 'Salida',
      icon: ArrowDownCircle,
      color: 'red',
      description: 'Retirar stock',
    },
    {
      id: 'ADJUST' as const,
      label: 'Ajuste',
      icon: Edit3,
      color: 'blue',
      description: 'Ajustar a cantidad exacta',
    },
    {
      id: 'DAMAGE' as const,
      label: 'Daño',
      icon: AlertCircle,
      color: 'orange',
      description: 'Registrar daño',
    },
    {
      id: 'RETURN' as const,
      label: 'Devolución',
      icon: RotateCcw,
      color: 'indigo',
      description: 'Devolución de cliente',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold ">Ajustar Stock</h2>
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
            <p className="text-sm text-secondary mb-1">Producto</p>
            <p className="text-lg font-semibold ">{stock.product_name}</p>
            {stock.product_sku && (
              <p className="text-sm text-tertiary font-mono">SKU: {stock.product_sku}</p>
            )}
            <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-secondary">Stock actual:</span>
                <span className="ml-2 font-bold ">{stock.quantity}</span>
              </div>
              <div>
                <span className="text-secondary">Reservado:</span>
                <span className="ml-2 font-bold ">{stock.reserved_quantity}</span>
              </div>
              <div>
                <span className="text-secondary">Disponible:</span>
                <span className="ml-2 font-bold text-green-600">{stock.available_quantity}</span>
              </div>
            </div>
          </div>

          {/* Movement type selection */}
          <div>
            <Label className="mb-3">Tipo de movimiento</Label>
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
              {movementType === 'ADJUST' ? 'Nueva cantidad' : 'Cantidad'}
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
                Cantidad excede el stock disponible ({stock.available_quantity})
              </p>
            )}
          </div>

          {/* Reference number */}
          <div>
            <Label htmlFor="reference">Número de referencia (Opcional)</Label>
            <Input
              id="reference"
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Ej: PO-12345, FACTURA-001"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del ajuste, observaciones..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Preview */}
          {quantity > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-2">Vista previa</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600">Stock actual:</span>
                <span className="font-semibold text-blue-900">{stock.quantity}</span>
              </div>
              {movementType !== 'ADJUST' && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-blue-600">
                    {['IN', 'RETURN'].includes(movementType) ? 'Agregar:' : 'Restar:'}
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
                <span className="text-sm font-semibold text-blue-700">Nuevo stock:</span>
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
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || quantity <= 0}
            className="flex-1"
          >
            {isLoading ? 'Procesando...' : 'Confirmar Ajuste'}
          </Button>
        </div>
      </div>
    </div>
  );
}
