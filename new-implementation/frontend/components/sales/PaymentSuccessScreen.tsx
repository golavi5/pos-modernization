'use client';

import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);

interface PaymentSuccessScreenProps {
  total: number;
  received: number;
  change: number;
  method: 'cash' | 'card' | 'mixed';
  countdown: number;
  onNewSale: () => void;
}

export function PaymentSuccessScreen({
  total,
  received,
  change,
  method,
  countdown,
  onNewSale,
}: PaymentSuccessScreenProps) {
  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
      data-testid="payment-success"
    >
      <CheckCircle className="w-20 h-20 text-emerald-500 mb-4" />
      <h2 className="text-2xl font-bold text-emerald-500 mb-1">¡Pago completado!</h2>
      <p className="text-muted-foreground text-sm mb-8">
        {new Date().toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="bg-card rounded-xl border border-border w-full max-w-sm p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total cobrado</span>
          <span className="font-semibold">{formatCurrency(total)}</span>
        </div>
        {method === 'cash' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Recibido</span>
              <span className="font-semibold">{formatCurrency(received)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-emerald-500 font-semibold">Cambio</span>
              <span className="text-emerald-500 text-xl font-bold">
                {formatCurrency(change)}
              </span>
            </div>
          </>
        )}
      </div>

      <Button onClick={onNewSale} size="lg" className="w-full max-w-sm">
        + Nueva venta
      </Button>
      <p className="text-muted-foreground text-xs mt-3">
        Auto-regresa en {countdown}s...
      </p>
    </div>
  );
}
