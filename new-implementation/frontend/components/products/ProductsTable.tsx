'use client';

import { Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProducts, useDeleteProduct } from '@/hooks/useProducts';
import type { Product } from '@/types/product';

interface ProductsTableProps {
  search?: string;
  onEdit: (product: Product) => void;
}

export function ProductsTable({ search, onEdit }: ProductsTableProps) {
  const { data: productsData, isLoading } = useProducts({ search, page: 1, pageSize: 50 });
  const deleteMutation = useDeleteProduct();

  const products: Product[] = productsData?.data ?? [];

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

  const handleDelete = async (product: Product) => {
    if (window.confirm(`¿Eliminar "${product.name}"?`)) {
      await deleteMutation.mutateAsync(product.id);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2 p-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No se encontraron productos</p>
        <p className="text-muted-foreground/70 text-sm mt-2">
          Intenta ajustar la búsqueda o crear un nuevo producto
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left p-4 font-semibold text-muted-foreground text-sm">Producto</th>
            <th className="text-left p-4 font-semibold text-muted-foreground text-sm">SKU</th>
            <th className="text-left p-4 font-semibold text-muted-foreground text-sm">Categoría</th>
            <th className="text-right p-4 font-semibold text-muted-foreground text-sm">Precio</th>
            <th className="text-center p-4 font-semibold text-muted-foreground text-sm">Stock</th>
            <th className="text-center p-4 font-semibold text-muted-foreground text-sm">Estado</th>
            <th className="text-center p-4 font-semibold text-muted-foreground text-sm">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr
              key={product.id}
              className="border-b border-border hover:bg-muted/30 transition-colors"
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
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">IMG</span>
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{product.name}</div>
                    {product.description && (
                      <div className="text-sm text-muted-foreground truncate max-w-xs">
                        {product.description}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="p-4">
                <span className="font-mono text-sm text-muted-foreground">{product.sku}</span>
              </td>
              <td className="p-4">
                <span className="text-sm text-muted-foreground">
                  {product.category || '-'}
                </span>
              </td>
              <td className="p-4 text-right">
                <span className="font-semibold">{formatCurrency(product.price)}</span>
              </td>
              <td className="p-4 text-center">
                <div>
                  <span className="font-semibold">{product.stock_quantity}</span>
                  {product.unit_of_measure && (
                    <span className="text-sm text-muted-foreground ml-1">
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
                    onClick={() => onEdit(product)}
                    title="Editar"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(product)}
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
