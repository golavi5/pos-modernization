'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSearchProducts } from '@/hooks/useProducts';
import type { Product } from '@/types/product';

interface ProductSearchProps {
  onAddProduct: (product: Product) => void;
}

export function ProductSearch({ onAddProduct }: ProductSearchProps) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const { data: results, isLoading } = useSearchProducts(query);

  useEffect(() => {
    setShowResults(query.length > 0);
  }, [query]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddProduct = (product: Product) => {
    onAddProduct(product);
    setQuery('');
    setShowResults(false);
  };

  const getStockBadge = (product: Product) => {
    if (product.stock_quantity === 0) {
      return <Badge variant="error">Sin stock</Badge>;
    }
    if (product.min_stock_level && product.stock_quantity <= product.min_stock_level) {
      return <Badge variant="warning">Stock bajo</Badge>;
    }
    return <Badge variant="success">Disponible</Badge>;
  };

  return (
    <div className="relative">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Buscar por nombre, SKU o código de barras..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Results dropdown */}
      {showResults && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm">Buscando productos...</p>
            </div>
          )}

          {!isLoading && results && results.length === 0 && (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No se encontraron productos</p>
              <p className="text-sm text-gray-400 mt-1">
                Intenta con otro término de búsqueda
              </p>
            </div>
          )}

          {!isLoading && results && results.length > 0 && (
            <div className="divide-y divide-gray-100">
              {results.map((product) => (
                <div
                  key={product.id}
                  className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => handleAddProduct(product)}
                >
                  <div className="flex items-center gap-3">
                    {/* Product image */}
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-12 h-12 rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}

                    {/* Product info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500 font-mono">
                          SKU: {product.sku}
                        </span>
                        {getStockBadge(product)}
                      </div>
                    </div>

                    {/* Price and action */}
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(product.price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Stock: {product.stock_quantity}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddProduct(product);
                      }}
                      disabled={product.stock_quantity === 0}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Backdrop */}
      {showResults && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
