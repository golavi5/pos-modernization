'use client';

import { useState } from 'react';
import { X, Award, Plus, Minus, Edit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import type { Customer } from '@/types/customer';

interface LoyaltyPointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onConfirm: (operation: 'add' | 'subtract' | 'set', points: number) => void;
  isLoading?: boolean;
}

export function LoyaltyPointsModal({
  isOpen,
  onClose,
  customer,
  onConfirm,
  isLoading,
}: LoyaltyPointsModalProps) {
  const [operation, setOperation] = useState<'add' | 'subtract' | 'set'>('add');
  const [points, setPoints] = useState<number>(0);

  if (!isOpen || !customer) return null;

  const handleConfirm = () => {
    if (points <= 0) {
      alert('Ingresa una cantidad válida de puntos');
      return;
    }

    if (operation === 'subtract' && points > customer.loyalty_points) {
      alert('No hay suficientes puntos para restar');
      return;
    }

    onConfirm(operation, points);
    setPoints(0);
  };

  const getNewBalance = () => {
    switch (operation) {
      case 'add':
        return customer.loyalty_points + points;
      case 'subtract':
        return customer.loyalty_points - points;
      case 'set':
        return points;
      default:
        return customer.loyalty_points;
    }
  };

  const operations = [
    {
      id: 'add' as const,
      label: 'Agregar',
      icon: Plus,
      color: 'green',
      description: 'Sumar puntos al balance actual',
    },
    {
      id: 'subtract' as const,
      label: 'Restar',
      icon: Minus,
      color: 'red',
      description: 'Restar puntos del balance actual',
    },
    {
      id: 'set' as const,
      label: 'Establecer',
      icon: Edit,
      color: 'blue',
      description: 'Definir un nuevo balance exacto',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">Gestionar Puntos</h2>
          </div>
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
          {/* Customer info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Cliente</p>
            <p className="text-lg font-semibold text-gray-900">{customer.name}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">Balance actual:</span>
              <span className="text-xl font-bold text-yellow-600">
                {customer.loyalty_points} puntos
              </span>
            </div>
          </div>

          {/* Operation selection */}
          <div>
            <Label className="mb-3">Operación</Label>
            <div className="grid grid-cols-3 gap-3">
              {operations.map((op) => {
                const Icon = op.icon;
                const isSelected = operation === op.id;
                return (
                  <button
                    key={op.id}
                    onClick={() => setOperation(op.id)}
                    className={`
                      p-4 rounded-lg border-2 transition-all text-center
                      ${
                        isSelected
                          ? `border-${op.color}-500 bg-${op.color}-50`
                          : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon
                      className={`w-6 h-6 mx-auto mb-2 ${
                        isSelected ? `text-${op.color}-600` : 'text-gray-400'
                      }`}
                    />
                    <p
                      className={`text-sm font-medium ${
                        isSelected ? `text-${op.color}-900` : 'text-gray-700'
                      }`}
                    >
                      {op.label}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {operations.find((op) => op.id === operation)?.description}
            </p>
          </div>

          {/* Points input */}
          <div>
            <Label htmlFor="points">
              {operation === 'set' ? 'Nuevo balance' : 'Cantidad de puntos'}
            </Label>
            <Input
              id="points"
              type="number"
              min="0"
              value={points || ''}
              onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {/* Preview */}
          {points > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-700 mb-2">Vista previa</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600">Balance actual:</span>
                <span className="font-semibold text-blue-900">
                  {customer.loyalty_points}
                </span>
              </div>
              {operation !== 'set' && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-blue-600">
                    {operation === 'add' ? 'Sumar:' : 'Restar:'}
                  </span>
                  <span
                    className={`font-semibold ${
                      operation === 'add' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {operation === 'add' ? '+' : '-'}
                    {points}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-300">
                <span className="text-sm font-semibold text-blue-700">
                  Nuevo balance:
                </span>
                <span className="text-xl font-bold text-blue-900">
                  {getNewBalance()}
                </span>
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
            disabled={isLoading || points <= 0}
            className="flex-1"
          >
            {isLoading ? 'Procesando...' : 'Confirmar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
