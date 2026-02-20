'use client';

import { useEffect } from 'react';
import { CategoryManager } from '@/components/products/CategoryManager';
import { useToolbar } from '@/components/layout/ToolbarContext';

export default function CategoriesPage() {
  const { setToolbar } = useToolbar();

  useEffect(() => {
    setToolbar({ title: 'Categorías', backHref: '/products' });
  }, [setToolbar]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <CategoryManager />
    </div>
  );
}
