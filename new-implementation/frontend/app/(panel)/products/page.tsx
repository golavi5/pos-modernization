'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOver } from '@/components/ui/slide-over';
import { ProductsTable } from '@/components/products/ProductsTable';
import { ProductForm } from '@/components/products/ProductForm';
import type { Product } from '@/types/product';

export default function ProductsPage() {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const [search, setSearch] = useState('');
  const [slideOver, setSlideOver] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editTarget, setEditTarget] = useState<Product | null>(null);

  const openNew = () => { setEditTarget(null); setSlideOver('new'); };
  const openEdit = (product: Product) => { setEditTarget(product); setSlideOver('edit'); };
  const close = () => setSlideOver('closed');

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchProducts')}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus size={14} /> {t('newProduct')}
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <ProductsTable search={search} onEdit={openEdit} />
      </div>

      {/* Slide-over */}
      <SlideOver
        open={slideOver !== 'closed'}
        onClose={close}
        title={slideOver === 'new' ? t('newProduct') : t('editProduct')}
        footer={
          <>
            <Button variant="outline" onClick={close} className="flex-1">
              {tCommon('cancel')}
            </Button>
            <Button form="product-form" type="submit" className="flex-1">
              {tCommon('save')}
            </Button>
          </>
        }
      >
        <ProductForm
          product={editTarget ?? undefined}
          formId="product-form"
          onSuccess={close}
        />
      </SlideOver>
    </div>
  );
}
