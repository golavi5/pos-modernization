'use client';

import { Pencil, Trash2, Eye, Package } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onView: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete, onView }: ProductCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStockBadge = () => {
    if (product.stock_quantity === 0) {
      return <Badge variant="error">Sin stock</Badge>;
    }
    if (product.min_stock_level && product.stock_quantity <= product.min_stock_level) {
      return <Badge variant="warning">Stock bajo</Badge>;
    }
    return <Badge variant="success">En stock</Badge>;
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {/* Image */}
      <div className="relative h-48 bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-300" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          {product.is_active ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="default">Inactivo</Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Name and Category */}
        <div>
          <h3 className="font-semibold text-gray-900 text-lg truncate">
            {product.name}
          </h3>
          {product.category && (
            <p className="text-sm text-gray-500">{product.category}</p>
          )}
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
        )}

        {/* SKU and Barcode */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-mono bg-gray-100 px-2 py-1 rounded">
            SKU: {product.sku}
          </span>
          {product.barcode && (
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              Código: {product.barcode}
            </span>
          )}
        </div>

        {/* Price and Stock */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(product.price)}
            </p>
            {product.cost && product.cost > 0 && (
              <p className="text-xs text-gray-500">
                Costo: {formatCurrency(product.cost)}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-gray-900">
              {product.stock_quantity}
              {product.unit_of_measure && (
                <span className="text-sm text-gray-500 ml-1">
                  {product.unit_of_measure}
                </span>
              )}
            </p>
            {getStockBadge()}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(product)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(product)}
            className="flex-1"
          >
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(product)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
