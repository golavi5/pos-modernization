'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ProductFiltersProps {
  onSearch: (search: string) => void;
  onCategoryFilter: (categoryId: string | undefined) => void;
}

export function ProductFilters({ onSearch, onCategoryFilter }: ProductFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  return (
    <div className="flex gap-4 mb-6">
      <div className="flex-1">
        <Input
          placeholder="Search by name, SKU, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>
      <Button onClick={handleSearch}>Search</Button>
      <Button variant="outline" onClick={() => { setSearchTerm(''); onSearch(''); }}>
        Clear
      </Button>
    </div>
  );
}
