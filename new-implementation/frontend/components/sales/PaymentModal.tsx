'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Numpad } from './Numpad';
import { cn } from '@/lib/utils';

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

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount);

export function PaymentModal({
  isOpen,
  onClose,
  total,
  onConfirm,
  isLoading,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [status, setStatus] = useState<ModalStatus>('payment');
  const [countdown, setCountdown] = useState(5);

  const received = parseFloat(cashReceived) || 0;
  const change = received - total;
  const canConfirm = method !== 'cash' || received >= total;

  const handleNewSale = useCallback(() => {
    setStatus('payment');
    setCashReceived('');
    setCountdown(5);
    onClose();
  }, [onClose]);

  const handleConfirm = useCallback(async () => {
    if (!canConfirm || isLoading) return;
    await onConfirm(method);
    setStatus('success');
    setCountdown(5);
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Success screen
  if (status === 'success') {
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

        <Button onClick={handleNewSale} size="lg" className="w-full max-w-sm">
          + Nueva venta
        </Button>
        <p className="text-muted-foreground text-xs mt-3">
          Auto-regresa en {countdown}s...
        </p>
      </div>
    );
  }

  // Payment screen
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={16} />
          Volver al carrito
        </button>
        <span className="text-xs text-muted-foreground">Venta en curso</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
        <div className="w-full max-w-sm space-y-4">
          {/* Total */}
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Total a cobrar
            </p>
            <p className="text-5xl font-extrabold tracking-tight">
              {formatCurrency(total)}
            </p>
          </div>

          {/* Method tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {(['cash', 'card', 'mixed'] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'flex-1 py-2 rounded-md text-xs font-semibold transition-colors',
                  method === m
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {m === 'cash' ? '💵 Efectivo' : m === 'card' ? '💳 Tarjeta' : '🔀 Mixto'}
              </button>
            ))}
          </div>

          {method === 'cash' && (
            <>
              {/* Cash display */}
              <div
                className={cn(
                  'bg-card border-2 rounded-xl px-4 py-3 transition-colors',
                  received > 0 ? 'border-primary' : 'border-border'
                )}
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                  Efectivo recibido
                </p>
                <p className="text-3xl font-bold">
                  {received > 0 ? formatCurrency(received) : '—'}
                </p>
              </div>

              {/* Change */}
              {received >= total && (
                <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl px-4 py-3 flex justify-between items-center">
                  <span className="text-emerald-400 text-sm font-semibold">💚 Cambio</span>
                  <span className="text-emerald-400 text-2xl font-bold">
                    {formatCurrency(change)}
                  </span>
                </div>
              )}

              {/* Quick amounts */}
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashReceived(String(amt))}
                    className="bg-card border border-border rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    ${(amt / 1000).toFixed(0)}k
                  </button>
                ))}
              </div>

              {/* Numpad */}
              <Numpad value={cashReceived} onChange={setCashReceived} />
            </>
          )}

          {method === 'card' && (
            <div className="text-center py-10 text-muted-foreground space-y-1">
              <p className="text-2xl">💳</p>
              <p className="text-sm">Procesa el pago en el terminal</p>
              <p className="text-xs">Confirma cuando el terminal apruebe</p>
            </div>
          )}

          {method === 'mixed' && (
            <div className="text-center py-10 text-muted-foreground">
              <p className="text-xs">Funcionalidad de pago mixto — próximamente</p>
            </div>
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
              'Procesando...'
            ) : (
              <>
                ✓ Confirmar pago{' '}
                <span className="ml-2 text-xs opacity-60 font-normal">Enter ↵</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
