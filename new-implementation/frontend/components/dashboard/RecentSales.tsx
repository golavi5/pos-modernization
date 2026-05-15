'use client';

import { useRouter } from 'next/navigation';
import { useSales } from '@/hooks/useSales';
import { formatCOP } from '@/lib/utils';
import type { Sale } from '@/types/sale';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  paid:     { label: 'Pagado',    className: 'bg-emerald-950/50 text-emerald-500 border-emerald-500/20' },
  pending:  { label: 'Pendiente', className: 'bg-amber-950/50 text-amber-500 border-amber-500/20' },
  partial:  { label: 'Parcial',   className: 'bg-blue-950/50 text-blue-500 border-blue-500/20' },
  refunded: { label: 'Devuelto',  className: 'bg-red-950/50 text-red-500 border-red-500/20' },
};

export function RecentSales() {
  const router = useRouter();
  const { data } = useSales({ page: 1, pageSize: 8 });
  const sales: Sale[] = data?.data ?? [];

  return (
    <div className="bg-card rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-foreground">Ventas recientes</p>
        <button
          onClick={() => router.push('/sales')}
          className="text-xs text-primary hover:underline"
        >
          Ver todas →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground uppercase text-[10px] tracking-widest border-b border-border">
              <th className="pb-2 text-left font-semibold">#</th>
              <th className="pb-2 text-left font-semibold">Cliente</th>
              <th className="pb-2 text-right font-semibold">Total</th>
              <th className="pb-2 text-right font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-b border-border/50 last:border-0">
                <td className="py-2 text-muted-foreground">#{sale.order_number ?? sale.id.slice(0, 6)}</td>
                <td className="py-2 text-foreground">{sale.customer_name ?? 'Sin cliente'}</td>
                <td className="py-2 text-right font-semibold">{formatCOP(sale.total_amount)}</td>
                <td className="py-2 text-right">
                  {(() => {
                    const s = STATUS_MAP[sale.payment_status] ?? STATUS_MAP['pending'];
                    return (
                      <span className={`${s.className} border text-[9px] font-semibold px-2 py-0.5 rounded-full`}>
                        {s.label}
                      </span>
                    );
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
