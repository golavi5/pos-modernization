'use client';

import { useState } from 'react';
import { X, CreditCard, DollarSign, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (paymentMethod: string, notes?: string) => void;
  isLoading?: boolean;
}

export function PaymentModal({
  isOpen,
  onClose,
  total,
  onConfirm,
  isLoading,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [notes, setNotes] = useState('');
  const [cashReceived, setCashReceived] = useState<number>(total);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const change = cashReceived - total;

  const paymentMethods = [
    {
      id: 'cash',
      label: 'Efectivo',
      icon: DollarSign,
      color: 'green',
    },
    {
      id: 'card',
      label: 'Tarjeta',
      icon: CreditCard,
      color: 'blue',
    },
    {
      id: 'transfer',
      label: 'Transferencia',
      icon: Smartphone,
      color: 'purple',
    },
  ];

  const handleConfirm = () => {
    if (paymentMethod === 'cash' && cashReceived < total) {
      alert('El monto recibido debe ser mayor o igual al total');
      return;
    }
    onConfirm(paymentMethod, notes || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Finalizar Venta</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total a pagar</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(total)}
            </p>
          </div>

          {/* Payment method selection */}
          <div>
            <Label className="mb-3">Método de pago</Label>
            <div className="grid grid-cols-3 gap-3">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id)}
                    className={`
                      p-4 rounded-lg border-2 transition-all
                      ${
                        isSelected
                          ? `border-${method.color}-500 bg-${method.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon
                      className={`w-8 h-8 mx-auto mb-2 ${
                        isSelected ? `text-${method.color}-600` : 'text-gray-400'
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? `text-${method.color}-900` : 'text-gray-700'
                      }`}
                    >
                      {method.label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cash specific fields */}
          {paymentMethod === 'cash' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cashReceived">Efectivo recibido</Label>
                <Input
                  id="cashReceived"
                  type="number"
                  step="1000"
                  min={total}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>

              {cashReceived >= total && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-1">Cambio</p>
                  <p className="text-2xl font-bold text-green-900">
                    {formatCurrency(change)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Cliente pidió factura, entregar en domicilio..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
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
            disabled={isLoading || (paymentMethod === 'cash' && cashReceived < total)}
            className="flex-1"
          >
            {isLoading ? 'Procesando...' : 'Confirmar Venta'}
          </Button>
        </div>
      </div>
    </div>
  );
}
