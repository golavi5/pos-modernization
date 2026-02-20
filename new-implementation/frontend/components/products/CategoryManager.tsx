'use client';

import { useState } from 'react';
import { useCategories, useCreateCategory } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function CategoryManager() {
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  const handleCreate = async () => {
    if (!newCategory.name) return;

    await createCategory.mutateAsync(newCategory);
    setNewCategory({ name: '', description: '' });
  };

  if (isLoading) return <div>Loading categories...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Category name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <Input
              placeholder="Description (optional)"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            />
            <Button onClick={handleCreate}>Add Category</Button>
          </div>

          <div className="space-y-2">
            {categories?.map((category: any) => (
              <div
                key={category.id}
                className="flex justify-between items-center p-3 border rounded-md"
              >
                <div>
                  <div className="font-medium">{category.name}</div>
                  {category.description && (
                    <div className="text-sm text-tertiary">{category.description}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
