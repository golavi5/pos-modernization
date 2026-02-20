'use client';

import { useState } from 'react';
import { User, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';

interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  loyalty_points?: number;
}

interface CustomerSelectProps {
  selectedCustomer?: Customer;
  onSelect: (customer: Customer | undefined) => void;
}

export function CustomerSelect({
  selectedCustomer,
  onSelect,
}: CustomerSelectProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock customers - In real app, use useCustomers hook
  const mockCustomers: Customer[] = [
    {
      id: '1',
      name: 'Cliente General',
      email: 'general@example.com',
      loyalty_points: 0,
    },
    {
      id: '2',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '+57 300 123 4567',
      loyalty_points: 150,
    },
    {
      id: '3',
      name: 'María García',
      email: 'maria@example.com',
      phone: '+57 301 987 6543',
      loyalty_points: 320,
    },
  ];

  const filteredCustomers = mockCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery)
  );

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setShowSearch(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    onSelect(undefined);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700">Cliente (Opcional)</label>
        {selectedCustomer && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="text-gray-500"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {selectedCustomer ? (
        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
          <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900">{selectedCustomer.name}</p>
            {selectedCustomer.email && (
              <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
            )}
          </div>
          {selectedCustomer.loyalty_points !== undefined &&
            selectedCustomer.loyalty_points > 0 && (
              <Badge variant="success">
                {selectedCustomer.loyalty_points} puntos
              </Badge>
            )}
        </div>
      ) : (
        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowSearch(!showSearch)}
            className="w-full justify-start"
          >
            <Search className="w-4 h-4 mr-2" />
            Buscar cliente...
          </Button>

          {showSearch && (
            <>
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
                {/* Search input */}
                <div className="p-3 border-b">
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, email o teléfono..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Results */}
                <div className="max-h-64 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No se encontraron clientes</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => handleSelect(customer)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">
                                {customer.name}
                              </p>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                {customer.email && <span>{customer.email}</span>}
                                {customer.phone && (
                                  <>
                                    {customer.email && <span>•</span>}
                                    <span>{customer.phone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            {customer.loyalty_points !== undefined &&
                              customer.loyalty_points > 0 && (
                                <Badge variant="success" className="text-xs">
                                  {customer.loyalty_points}
                                </Badge>
                              )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div
                className="fixed inset-0 z-0"
                onClick={() => setShowSearch(false)}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
