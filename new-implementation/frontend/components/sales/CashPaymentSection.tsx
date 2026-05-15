'use client';

import { Numpad } from './Numpad';
import { cn, formatCOP } from '@/lib/utils';

interface CashPaymentSectionProps {
  total: number;
  cashReceived: string;
  onChange: (value: string) => void;
  quickAmounts: number[];
}

export function CashPaymentSection({
  total,
  cashReceived,
  onChange,
  quickAmounts,
}: CashPaymentSectionProps) {
  const received = parseFloat(cashReceived) || 0;
  const change = received - total;

  return (
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
          {received > 0 ? formatCOP(received) : '—'}
        </p>
      </div>

      {/* Change */}
      {received >= total && (
        <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl px-4 py-3 flex justify-between items-center">
          <span className="text-emerald-400 text-sm font-semibold">💚 Cambio</span>
          <span className="text-emerald-400 text-2xl font-bold">
            {formatCOP(change)}
          </span>
        </div>
      )}

      {/* Quick amounts */}
      <div className="grid grid-cols-4 gap-1.5">
        {quickAmounts.map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => onChange(String(amt))}
            className="bg-card border border-border rounded-lg py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            ${(amt / 1000).toFixed(0)}k
          </button>
        ))}
      </div>

      {/* Numpad */}
      <Numpad value={cashReceived} onChange={onChange} />
    </>
  );
}
