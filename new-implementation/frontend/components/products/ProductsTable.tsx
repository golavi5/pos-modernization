'use client';

import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types/product';

interface ProductsTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
  isLoading?: boolean;
}

export function ProductsTable({
  products,
  onEdit,
  onDelete,
  onView,
  isLoading,
}: ProductsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockStatus = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="destructive">Sin stock</Badge>;
    }
    if (product.min_stock_level && product.stock_quantity <= product.min_stock_level) {
      return <Badge variant="warning">Stock bajo</Badge>;
    }
    return <Badge variant="success">En stock</Badge>;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
        <div className="h-12 bg-gray-200 rounded mb-4"></div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-tertiary text-lg">No se encontraron productos</p>
        <p className="text-quaternary text-sm mt-2">
          Intenta ajustar los filtros o crear un nuevo producto
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left p-4 font-semibold text-secondary">Producto</th>
            <th className="text-left p-4 font-semibold text-secondary">SKU</th>
            <th className="text-left p-4 font-semibold text-secondary">Categoría</th>
            <th className="text-right p-4 font-semibold text-secondary">Precio</th>
            <th className="text-center p-4 font-semibold text-secondary">Stock</th>
            <th className="text-center p-4 font-semibold text-secondary">Estado</th>
            <th className="text-center p-4 font-semibold text-secondary">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <td className="p-4">
                <div className="flex items-center gap-3">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center">
                      <span className="text-quaternary text-xs">IMG</span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium ">{product.name}</div>
                    {product.description && (
                      <div className="text-sm text-tertiary truncate max-w-xs">
                        {product.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className="font-mono text-sm text-secondary">{product.sku}</span>
              </td>
              <td className="p-4">
                <span className="text-sm text-secondary">
                  {product.category || '-'}
                </span>
              </td>
              <td className="p-4 text-right">
                <span className="font-semibold ">
                  {formatCurrency(product.price)}
                </span>
              </td>
              <td className="p-4 text-center">
                <div>
                  <span className="font-semibold ">
                    {product.stock_quantity}
                  </span>
                  {product.unit_of_measure && (
                    <span className="text-sm text-tertiary ml-1">
                      {product.unit_of_measure}
                    </span>
                  )}
                </div>
                {getStockStatus(product)}
              </td>
              <td className="p-4 text-center">
                {product.is_active ? (
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
                    onClick={() => onView(product)}
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(product)}
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(product)}
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
