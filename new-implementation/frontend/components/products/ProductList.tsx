'use client';

import type { Product } from '@/types/product';
import { StockBadge } from './StockBadge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface ProductListProps {
  products: Product[];
  onDelete?: (id: string) => void;
}

export function ProductList({ products, onDelete }: ProductListProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">Name</th>
            <th className="text-left p-3">SKU</th>
            <th className="text-left p-3">Price</th>
            <th className="text-left p-3">Stock</th>
            <th className="text-left p-3">Status</th>
            <th className="text-right p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b hover:bg-gray-50">
              <td className="p-3">
                <div>
                  <div className="font-medium">{product.name}</div>
                  <div className="text-sm text-tertiary">{product.description}</div>
                </div>
              </td>
              <td className="p-3">{product.sku}</td>
              <td className="p-3">${product.price.toFixed(2)}</td>
              <td className="p-3">
                <StockBadge
                  stock={product.stock_quantity}
                  reorderLevel={product.reorder_level ?? 0}
                />
              </td>
              <td className="p-3">
                {product.is_active ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-quaternary">Inactive</span>
                )}
              </td>
              <td className="p-3 text-right">
                <div className="flex gap-2 justify-end">
                  <Link href={`/products/${product.id}`}>
                    <Button size="sm" variant="outline">View</Button>
                  </Link>
                  <Link href={`/products/${product.id}/edit`}>
                    <Button size="sm">Edit</Button>
                  </Link>
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(product.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
