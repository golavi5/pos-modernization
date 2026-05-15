'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CustomerSelect } from './CustomerSelect';
import { formatCOP } from '@/lib/utils';
import type { CartItem } from '@/types/sale';

interface SalesCartProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customerId?: string;
  customerName?: string;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onSelectCustomer: (customer: { id: string; name: string } | undefined) => void;
  onCheckout: () => void;
}

export function SalesCart({
  items,
  subtotal,
  tax,
  discount,
  total,
  customerId,
  customerName,
  onUpdateQuantity,
  onRemoveItem,
  onSelectCustomer,
  onCheckout,
}: SalesCartProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border shrink-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Carrito · {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

      {/* Customer selector */}
      <div className="px-3 py-2 border-b border-border shrink-0">
        <CustomerSelect
          selectedCustomer={
            customerId && customerName
              ? { id: customerId, name: customerName }
              : undefined
          }
          onSelect={onSelectCustomer}
        />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs gap-2 py-8">
            <span className="text-3xl">🛒</span>
            <span>Agrega productos al carrito</span>
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.product_id}
            className="flex items-center gap-2 py-2 border-b border-border/50 last:border-0"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {item.product_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatCOP(item.unit_price)}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onUpdateQuantity(item.product_id, item.quantity - 1)}
                disabled={item.quantity <= 1}
                className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <Minus size={10} />
              </button>
              <span className="text-xs font-semibold w-5 text-center">
                {item.quantity}
              </span>
              <button
                onClick={() => onUpdateQuantity(item.product_id, item.quantity + 1)}
                disabled={item.quantity >= (item.stock_quantity ?? Infinity)}
                className="w-5 h-5 rounded bg-muted flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 transition-colors"
              >
                <Plus size={10} />
              </button>
            </div>
            <p className="text-xs font-bold text-foreground w-14 text-right shrink-0">
              {formatCOP(item.subtotal)}
            </p>
            <button
              onClick={() => onRemoveItem(item.product_id)}
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Totals + Checkout */}
      <div className="px-4 py-3 border-t border-border shrink-0 space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCOP(subtotal)}</span>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>IVA (19%)</span>
          <span>{formatCOP(tax)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-xs text-emerald-500">
            <span>Descuento</span>
            <span>-{formatCOP(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border">
          <span>Total</span>
          <span>{formatCOP(total)}</span>
        </div>

        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          size="lg"
          className="w-full font-bold mt-1"
          data-testid="cobrar-button"
        >
          💳 Cobrar {items.length > 0 ? formatCOP(total) : ''}
        </Button>

        {items.length > 0 && (
          <button
            onClick={() => {
              if (confirm('¿Limpiar el carrito?')) {
                items.forEach((i) => onRemoveItem(i.product_id));
              }
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Limpiar carrito
          </button>
        )}
      </div>
    </div>
  );
}
