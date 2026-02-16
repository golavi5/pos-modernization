'use client';

import { ArrowUpCircle, ArrowDownCircle, Edit3, TrendingUp, AlertCircle, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { StockMovement } from '@/types/inventory';

interface StockMovementsProps {
  movements: StockMovement[];
  isLoading?: boolean;
}

export function StockMovements({ movements, isLoading }: StockMovementsProps) {
  const getMovementConfig = (type: StockMovement['movement_type']) => {
    const configs = {
      IN: {
        label: 'Entrada',
        icon: ArrowUpCircle,
        variant: 'success' as const,
        color: 'text-green-600',
      },
      OUT: {
        label: 'Salida',
        icon: ArrowDownCircle,
        variant: 'error' as const,
        color: 'text-red-600',
      },
      ADJUST: {
        label: 'Ajuste',
        icon: Edit3,
        variant: 'default' as const,
        color: 'text-blue-600',
      },
      TRANSFER: {
        label: 'Transferencia',
        icon: TrendingUp,
        variant: 'default' as const,
        color: 'text-purple-600',
      },
      DAMAGE: {
        label: 'Daño',
        icon: AlertCircle,
        variant: 'warning' as const,
        color: 'text-orange-600',
      },
      RETURN: {
        label: 'Devolución',
        icon: RotateCcw,
        variant: 'default' as const,
        color: 'text-indigo-600',
      },
    };
    return configs[type] || configs.ADJUST;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (movements.length === 0) {
    return (
      <div className="text-center py-12">
        <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">No hay movimientos registrados</p>
        <p className="text-gray-400 text-sm mt-2">
          Los movimientos de stock aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {movements.map((movement) => {
        const config = getMovementConfig(movement.movement_type);
        const Icon = config.icon;

        return (
          <div
            key={movement.id}
            className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center ${config.color}`}>
              <Icon className="w-6 h-6" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-gray-900">
                  {movement.product_name || 'Producto'}
                </h4>
                <Badge variant={config.variant}>{config.label}</Badge>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div className="flex items-center gap-4">
                  <span>
                    <span className="font-medium">Almacén:</span> {movement.warehouse_name}
                    {movement.location_name && ` - ${movement.location_name}`}
                  </span>
                  {movement.reference_number && (
                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                      Ref: {movement.reference_number}
                    </span>
                  )}
                </div>
                {movement.notes && (
                  <p className="text-gray-500 italic">{movement.notes}</p>
                )}
              </div>
            </div>

            {/* Quantity and Date */}
            <div className="text-right">
              <div className={`text-2xl font-bold ${config.color}`}>
                {movement.movement_type === 'IN' || movement.movement_type === 'RETURN' ? '+' : '-'}
                {movement.quantity}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {formatDate(movement.created_at)}
              </div>
              {movement.user_name && (
                <div className="text-xs text-gray-400 mt-1">
                  Por: {movement.user_name}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
