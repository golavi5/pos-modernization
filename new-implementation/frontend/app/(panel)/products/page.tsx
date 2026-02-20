'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Package, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductsTable } from '@/components/products/ProductsTable';
import { ProductFilters } from '@/components/products/ProductFilters';
import { ProductForm } from '@/components/products/ProductForm';
import { useToolbar } from '@/components/layout/ToolbarContext';
import {
  useProducts,
  useProductStats,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '@/hooks/useProducts';
import type { Product, ProductQueryParams, CreateProductDto } from '@/types/product';

export default function ProductsPage() {
  const { setToolbar } = useToolbar();
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const [queryParams, setQueryParams] = useState<ProductQueryParams>({
    page: 1,
    pageSize: 20,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Queries
  const { data: productsData, isLoading } = useProducts(queryParams);
  const { data: stats } = useProductStats();

  // Mutations
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  useEffect(() => {
    setToolbar({ title: t('title') });
  }, [setToolbar, t]);

  const handleFilterChange = (filters: ProductQueryParams) => {
    setQueryParams({ ...filters, page: 1, pageSize: 20 });
  };

  const handleCreateNew = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleView = (product: Product) => {
    // TODO: Implement product detail modal
    console.log('View product:', product);
  };

  const handleDelete = async (product: Product) => {
    if (
      window.confirm(
        t('deleteConfirm', { name: product.name })
      )
    ) {
      try {
        await deleteMutation.mutateAsync(product.id);
        alert(t('deleteSuccess'));
      } catch (error) {
        alert(t('deleteError'));
        console.error(error);
      }
    }
  };

  const handleSubmit = async (data: CreateProductDto) => {
    try {
      if (editingProduct) {
        await updateMutation.mutateAsync({ id: editingProduct.id, data });
        alert(t('updateSuccess'));
      } else {
        await createMutation.mutateAsync(data);
        alert(t('createSuccess'));
      }
      setShowForm(false);
      setEditingProduct(null);
    } catch (error) {
      alert(editingProduct ? t('updateError') : t('createError'));
      console.error(error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-secondary mt-1">{t('description')}</p>
        </div>
        {!showForm && (
          <Button onClick={handleCreateNew}>
            <Plus className="w-5 h-5 mr-2" />
            {t('newProduct')}
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">{t('totalProducts')}</p>
                <p className="text-2xl font-bold mt-1">
                  {stats.totalProducts}
                </p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
            <div className="mt-4">
              <Badge variant="success">{stats.activeProducts} {tCommon('active')}</Badge>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">{t('totalValue')}</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">{t('lowStock')}</p>
                <p className="text-2xl font-bold text-warning mt-1">
                  {stats.lowStockCount}
                </p>
              </div>
              <AlertTriangle className="w-10 h-10 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-tertiary">{t('outOfStock')}</p>
                <p className="text-2xl font-bold text-error mt-1">
                  {stats.outOfStockCount}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-red-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Form or Table */}
      {showForm ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">
            {editingProduct ? t('editProduct') : t('createProduct')}
          </h2>
          <ProductForm
            product={editingProduct || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Card>
      ) : (
        <>
          {/* Filters */}
          <ProductFilters
            onFilterChange={handleFilterChange}
            categories={stats?.categories || []}
          />

          {/* Products Table */}
          <Card className="overflow-hidden">
            <ProductsTable
              products={productsData?.data || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              isLoading={isLoading}
            />

            {/* Pagination */}
            {productsData && productsData.total > 0 && (
              <div className="px-6 py-4 border-t flex items-center justify-between">
                <div className="text-sm text-tertiary">
                  {t('showing', {
                    from: ((productsData.page - 1) * productsData.pageSize) + 1,
                    to: Math.min(productsData.page * productsData.pageSize, productsData.total),
                    total: productsData.total
                  })}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={productsData.page === 1}
                    onClick={() =>
                      setQueryParams((prev) => ({ ...prev, page: prev.page! - 1 }))
                    }
                  >
                    {tCommon('previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      productsData.page >=
                      Math.ceil(productsData.total / productsData.pageSize)
                    }
                    onClick={() =>
                      setQueryParams((prev) => ({ ...prev, page: prev.page! + 1 }))
                    }
                  >
                    {tCommon('next')}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
