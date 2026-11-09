'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import { useAuthStore } from '@/stores/authStore';
import type { Translate } from '@/types/i18n';

interface CategorySelectProps {
  value?: string;
  onChange: (categoryId: string) => void;
  t: Translate<'products'>;
}

const CAN_CREATE_ROLES = ['admin', 'manager'];

export function CategorySelect({ value, onChange, t }: CategorySelectProps) {
  const { data: categories = [] } = useCategories();
  const createCategory = useCreateCategory();
  const canCreate = useAuthStore((s) =>
    s.user?.roles?.some((r) => CAN_CREATE_ROLES.includes(r)),
  );
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await createCategory.mutateAsync({ name });
      onChange(created.id);
      setNewName('');
    } catch {
      // surfaced via createCategory.isError below
    }
  };

  return (
    <div className="space-y-2">
      <select
        id="category_id"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border bg-surface-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{t('categorySelectPlaceholder')}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {canCreate ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t('categoryNewPlaceholder')}
            aria-label={t('categoryNew')}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAdd}
            disabled={createCategory.isPending || !newName.trim()}
          >
            {t('categoryAdd')}
          </Button>
        </div>
      ) : (
        categories.length === 0 && (
          <p className="text-sm text-muted-foreground">{t('categoryNoneHint')}</p>
        )
      )}
      {createCategory.isError && (
        <p className="text-sm text-destructive">{t('categoryCreateError')}</p>
      )}
    </div>
  );
}
