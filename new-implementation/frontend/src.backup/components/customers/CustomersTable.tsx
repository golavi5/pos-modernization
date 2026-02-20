'use client';

import { Pencil, Trash2, Eye, Award, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Customer } from '@/types/customer';

interface CustomersTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onView: (customer: Customer) => void;
  onManageLoyalty: (customer: Customer) => void;
  isLoading?: boolean;
}

export function CustomersTable({
  customers,
  onEdit,
  onDelete,
  onView,
  onManageLoyalty,
  isLoading,
}: CustomersTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No se encontraron clientes</p>
        <p className="text-gray-400 text-sm mt-2">
          Intenta ajustar los filtros o crear un nuevo cliente
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left p-4 font-semibold text-gray-700">Cliente</th>
            <th className="text-left p-4 font-semibold text-gray-700">Contacto</th>
            <th className="text-right p-4 font-semibold text-gray-700">Compras</th>
            <th className="text-center p-4 font-semibold text-gray-700">Puntos</th>
            <th className="text-center p-4 font-semibold text-gray-700">Última compra</th>
            <th className="text-center p-4 font-semibold text-gray-700">Estado</th>
            <th className="text-center p-4 font-semibold text-gray-700">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="p-4">
                <div>
                  <div className="font-medium text-gray-900">{customer.name}</div>
                  {customer.address && (
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {customer.address}
                    </div>
                  )}
                </div>
              </td>
              <td className="p-4">
                <div className="text-sm">
                  {customer.email && (
                    <div className="text-gray-700">{customer.email}</div>
                  )}
                  {customer.phone && (
                    <div className="text-gray-500">{customer.phone}</div>
                  )}
                  {!customer.email && !customer.phone && (
                    <div className="text-gray-400">-</div>
                  )}
                </div>
              </td>
              <td className="p-4 text-right">
                <div>
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(customer.total_purchases)}
                  </div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
              </td>
              <td className="p-4 text-center">
                <div className="inline-flex items-center gap-1">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <span className="font-semibold text-gray-900">
                    {customer.loyalty_points}
                  </span>
                </div>
              </td>
              <td className="p-4 text-center">
                <span className="text-sm text-gray-600">
                  {formatDate(customer.last_purchase_date)}
                </span>
              </td>
              <td className="p-4 text-center">
                {customer.is_active ? (
                  <Badge variant="success">Activo</Badge>
                ) : (
                  <Badge variant="default">Inactivo</Badge>
                )}
              </td>
              <td className="p-4">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onView(customer)}
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onManageLoyalty(customer)}
                    title="Gestionar puntos"
                    className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                  >
                    <Award className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(customer)}
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(customer)}
                    title="Eliminar"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
