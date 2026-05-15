'use client';

import { useState } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { cn } from '@/lib/utils';
import type { Product } from '@/types/product';

interface ProductSearchProps {
  onAddProduct: (product: Product) => void;
}

export function ProductSearch({ onAddProduct }: ProductSearchProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const { data: productsData, isLoading } = useProducts();

  // API returns { data: Product[], total, page, pageSize } or Product[]
  const products: Product[] = Array.isArray(productsData)
    ? productsData
    : (productsData as { data?: Product[] })?.data ?? [];

  const categories = Array.from(
    new Set(
      products
        .map((p: Product) => p.category ?? p.category_id)
        .filter(Boolean)
    )
  ) as string[];

  const filtered = activeCategory
    ? products.filter(
        (p: Product) =>
          (p.category ?? p.category_id) === activeCategory
      )
    : products;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap shrink-0">
        <button
          onClick={() => setActiveCategory(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
            !activeCategory
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          )}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
              activeCategory === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-3 gap-2.5 overflow-auto flex-1 content-start pb-2">
        {filtered.map((product: Product) => {
          const outOfStock = product.stock_quantity === 0;
          const lowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
          return (
            <button
              key={product.id}
              onClick={() => !outOfStock && onAddProduct(product)}
              disabled={outOfStock}
              data-testid="product-card"
              className={cn(
                'flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                outOfStock
                  ? 'opacity-40 cursor-not-allowed bg-card border-border'
                  : 'bg-card border-border hover:border-primary hover:shadow-sm cursor-pointer active:scale-[0.98]'
              )}
            >
              <div className="w-full h-14 bg-muted rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    className="h-full w-full object-cover rounded-lg"
                    alt={product.name}
                  />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <p className="text-xs font-semibold text-foreground truncate w-full">
                {product.name}
              </p>
              <div className="flex items-center justify-between w-full mt-1 gap-1">
                <span className="text-sm font-bold text-primary">
                  {formatCurrency(product.price)}
                </span>
                <span
                  className={cn(
                    'text-[9px] font-semibold px-1.5 py-0.5 rounded border',
                    outOfStock
                      ? 'text-destructive border-destructive/30'
                      : lowStock
                      ? 'text-amber-500 border-amber-500/30'
                      : 'text-emerald-500 border-emerald-500/30'
                  )}
                >
                  {outOfStock ? 'Sin stock' : product.stock_quantity}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
