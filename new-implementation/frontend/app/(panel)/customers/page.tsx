'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SlideOver } from '@/components/ui/slide-over';
import { CustomersTable } from '@/components/customers/CustomersTable';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { LoyaltyPointsModal } from '@/components/customers/LoyaltyPointsModal';
import { useUpdateLoyaltyPoints, useDeleteCustomer } from '@/hooks/useCustomers';
import type { Customer } from '@/types/customer';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [slideOver, setSlideOver] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [loyaltyModalCustomer, setLoyaltyModalCustomer] = useState<Customer | null>(null);

  const deleteMutation = useDeleteCustomer();
  const updateLoyaltyMutation = useUpdateLoyaltyPoints();

  const openNew = () => { setEditTarget(null); setSlideOver('new'); };
  const openEdit = (customer: Customer) => { setEditTarget(customer); setSlideOver('edit'); };
  const close = () => setSlideOver('closed');

  const handleDelete = async (customer: Customer) => {
    if (
      window.confirm(
        `¿Estás seguro de eliminar el cliente "${customer.name}"? Esta acción es irreversible.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync(customer.id);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleLoyaltyConfirm = async (
    operation: 'add' | 'subtract' | 'set',
    points: number
  ) => {
    if (!loyaltyModalCustomer) return;
    try {
      await updateLoyaltyMutation.mutateAsync({
        id: loyaltyModalCustomer.id,
        data: { operation, points },
      });
      setLoyaltyModalCustomer(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar clientes..."
            className="pl-8 h-9 text-sm"
          />
        </div>
        <div className="flex-1" />
        <Button onClick={openNew} size="sm" className="gap-1.5">
          <Plus size={14} /> Nuevo cliente
        </Button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <CustomersTable
          search={search}
          onEdit={openEdit}
          onDelete={handleDelete}
          onManageLoyalty={setLoyaltyModalCustomer}
        />
      </div>

      {/* Slide-over */}
      <SlideOver
        open={slideOver !== 'closed'}
        onClose={close}
        title={slideOver === 'new' ? 'Nuevo cliente' : 'Editar cliente'}
        footer={
          <>
            <Button variant="outline" onClick={close} className="flex-1">Cancelar</Button>
            <Button form="customer-form" type="submit" className="flex-1">Guardar</Button>
          </>
        }
      >
        <CustomerForm
          customer={editTarget ?? undefined}
          formId="customer-form"
          onSuccess={close}
        />
      </SlideOver>

      {/* Loyalty Points Modal */}
      <LoyaltyPointsModal
        isOpen={!!loyaltyModalCustomer}
        onClose={() => setLoyaltyModalCustomer(null)}
        customer={loyaltyModalCustomer}
        onConfirm={handleLoyaltyConfirm}
        isLoading={updateLoyaltyMutation.isPending}
      />
    </div>
  );
}
