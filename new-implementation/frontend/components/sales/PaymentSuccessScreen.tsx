'use client';

import { CheckCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { formatCOP } from '@/lib/utils';

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
  const t = useTranslations('sales');
  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center p-6"
      data-testid="payment-success"
    >
      <CheckCircle className="w-20 h-20 text-emerald-500 mb-4" />
      <h2 className="text-2xl font-bold text-emerald-500 mb-1">{t('pagoCompletado')}</h2>
      <p className="text-muted-foreground text-sm mb-8">
        {new Date().toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit' })}
      </p>

      <div className="bg-card rounded-xl border border-border w-full max-w-sm p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">{t('payment.totalCharged')}</span>
          <span className="font-semibold">{formatCOP(total)}</span>
        </div>
        {method === 'cash' && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t('payment.received')}</span>
              <span className="font-semibold">{formatCOP(received)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-emerald-500 font-semibold">{t('change')}</span>
              <span className="text-emerald-500 text-xl font-bold">
                {formatCOP(change)}
              </span>
            </div>
          </>
        )}
      </div>

      <Button onClick={onNewSale} size="lg" className="w-full max-w-sm">
        {t('nuevaVenta')}
      </Button>
      <p className="text-muted-foreground text-xs mt-3">
        {t('autoRegresa', { seconds: countdown })}
      </p>
    </div>
  );
}
