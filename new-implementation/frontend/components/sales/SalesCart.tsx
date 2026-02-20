'use client';

import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CartItem } from '@/types/sale';

interface SalesCartProps {
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
}

export function SalesCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  subtotal,
  tax,
  discount,
  total,
}: SalesCartProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (items.length === 0) {
    return (
      <Card className="p-8 text-center">
        <div className="text-quaternary mb-2">
          <svg
            className="w-16 h-16 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <p className="text-lg font-medium text-secondary">Carrito vacío</p>
        <p className="text-sm text-quaternary mt-1">
          Busca productos para agregar al carrito
        </p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Items list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-center gap-3 p-3 bg-surface-1 rounded-lg"
          >
            {/* Product image */}
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.product_name}
                className="w-12 h-12 rounded object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                <span className="text-quaternary text-xs">IMG</span>
              </div>
            )}

            {/* Product info */}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">
                {item.product_name}
              </h4>
              <p className="text-sm text-tertiary">
                {formatCurrency(item.unit_price)} x {item.quantity}
              </p>
            </div>

            {/* Quantity controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-8 h-8 p-0"
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                disabled={item.quantity >= item.stock_quantity}
                className="w-8 h-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Subtotal and remove */}
            <div className="text-right">
              <p className="font-semibold">
                {formatCurrency(item.subtotal)}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveItem(item.product_id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="border-t p-4 space-y-2">
        <div className="flex justify-between text-sm text-secondary">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Descuento:</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-secondary">
          <span>IVA:</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex justify-between text-lg font-bold pt-2 border-t">
          <span>Total:</span>
          <span>{formatCurrency(total)}</span>
        </div>
      </div>
    </Card>
  );
}
