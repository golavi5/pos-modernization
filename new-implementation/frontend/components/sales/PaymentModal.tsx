'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PaymentSuccessScreen } from './PaymentSuccessScreen';
import { CashPaymentSection } from './CashPaymentSection';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { cn, formatCOP } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (paymentMethod: string, notes?: string) => Promise<void> | void;
  isLoading?: boolean;
}

type PaymentMethod = 'cash' | 'card' | 'mixed';
type ModalStatus = 'payment' | 'success';

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000];

export function PaymentModal({
  isOpen,
  onClose,
  total,
  onConfirm,
  isLoading,
}: PaymentModalProps) {
  const t = useTranslations('sales');
  const tCommon = useTranslations('common');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [status, setStatus] = useState<ModalStatus>('payment');
  const [countdown, setCountdown] = useState(5);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const overlayRef = useFocusTrap<HTMLDivElement>(isOpen && status === 'payment');

  const received = parseFloat(cashReceived) || 0;
  const canConfirm = method !== 'cash' || received >= total;

  const handleMethodChange = useCallback((m: PaymentMethod) => {
    setMethod(m);
    setConfirmError(null);
  }, []);

  const handleNewSale = useCallback(() => {
    setStatus('payment');
    setCashReceived('');
    setCountdown(5);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || isLoading) return;
    setConfirmError(null);
    try {
      await onConfirm(method);
      setStatus('success');
      setCountdown(5);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : t('payment.error'));
    }
  }, [canConfirm, isLoading, method, onConfirm]);

  // Enter key → confirm
  useEffect(() => {
    if (!isOpen || status !== 'payment') return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleConfirm();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, status, handleConfirm]);

  // Success countdown
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      handleNewSale();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, handleNewSale]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStatus('payment');
      setCashReceived('');
      setMethod('cash');
      setConfirmError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  if (status === 'success') {
    return (
      <PaymentSuccessScreen
        total={total}
        received={received}
        change={received - total}
        method={method}
        countdown={countdown}
        onNewSale={handleNewSale}
      />
    );
  }

  // Payment screen
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          {t('payment.backToCart')}
        </button>
        <span className="text-xs text-muted-foreground">{t('payment.inProgress')}</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="w-full max-w-sm space-y-4">
          {/* Total */}
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              {t('totalACobrar')}
            </p>
            <p className="text-5xl font-extrabold tracking-tight">
              {formatCOP(total)}
            </p>
          </div>

          {/* Method tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['cash', 'card', 'mixed'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => handleMethodChange(m)}
                className={cn(
                  'flex-1 py-2 rounded-md text-xs font-semibold transition-colors',
                  method === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'cash' ? `💵 ${t('cash')}` : m === 'card' ? `💳 ${t('card')}` : `🔀 ${t('payment.mixed')}`}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <CashPaymentSection
              total={total}
              cashReceived={cashReceived}
              onChange={setCashReceived}
              quickAmounts={QUICK_AMOUNTS}
            />
          )}

          {method === 'card' && (
            <div className="text-center py-10 text-muted-foreground space-y-1">
              <p className="text-2xl">💳</p>
              <p className="text-sm">{t('payment.cardInstructions')}</p>
              <p className="text-xs">{t('payment.cardConfirm')}</p>
            </div>
          )}

          {method === 'mixed' && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-xs">{t('payment.mixedComingSoon')}</p>
            </div>
          )}

          {confirmError && (
            <p className="text-destructive text-xs text-center">{confirmError}</p>
          )}

          {/* Confirm button */}
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            size="lg"
            className="w-full h-12 font-bold"
            data-testid="confirm-payment-button"
          >
            {isLoading ? (
              tCommon('processing')
            ) : (
              <>
                ✓ {t('confirmarPago')}{' '}
                <span className="ml-2 text-xs opacity-60 font-normal">{t('confirmShortcutHint')}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
