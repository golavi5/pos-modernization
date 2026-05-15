'use client';

import { useRouter } from 'next/navigation';
import { ShoppingCart, Warehouse, BarChart3, Plus } from 'lucide-react';

const ACTIONS = [
  { label: 'Nueva venta',         href: '/sales',     icon: ShoppingCart, primary: true },
  { label: 'Ajustar inventario',  href: '/inventory', icon: Warehouse,    primary: false },
  { label: 'Ver reporte del día', href: '/reports',   icon: BarChart3,    primary: false },
  { label: 'Agregar producto',    href: '/products',  icon: Plus,         primary: false },
];

export function QuickActions() {
  const router = useRouter();
  return (
    <div className="bg-card rounded-xl p-4">
      <p className="text-sm font-semibold text-foreground mb-3">Acciones rápidas</p>
      <div className="flex flex-col gap-2">
        {ACTIONS.map(({ label, href, icon: Icon, primary }) => (
          <button
            key={href}
            onClick={() => router.push(href)}
            className={
              primary
                ? 'flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors'
                : 'flex items-center gap-2.5 w-full rounded-lg px-3 py-2.5 text-sm text-foreground bg-background border border-border hover:bg-accent transition-colors'
            }
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
