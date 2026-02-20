'use client';

import { useState } from 'react';
import { Plus, Users, Award, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomersTable } from '@/components/customers/CustomersTable';
import { CustomerFilters } from '@/components/customers/CustomerFilters';
import { CustomerForm } from '@/components/customers/CustomerForm';
import { LoyaltyPointsModal } from '@/components/customers/LoyaltyPointsModal';
import {
  useCustomers,
  useCustomerStats,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  useUpdateLoyaltyPoints,
} from '@/hooks/useCustomers';
import type { Customer, CustomerQueryParams, CreateCustomerDto } from '@/types/customer';

export default function CustomersPage() {
  const [queryParams, setQueryParams] = useState<CustomerQueryParams>({
    page: 1,
    pageSize: 20,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loyaltyModalCustomer, setLoyaltyModalCustomer] = useState<Customer | null>(null);

  // Queries
  const { data: customersData, isLoading } = useCustomers(queryParams);
  const { data: stats } = useCustomerStats();

  // Mutations
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();
  const updateLoyaltyMutation = useUpdateLoyaltyPoints();

  const handleFilterChange = (filters: CustomerQueryParams) => {
    setQueryParams({ ...filters, page: 1, pageSize: 20 });
  };

  const handleCreateNew = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleView = (customer: Customer) => {
    // TODO: Implement customer detail modal
    console.log('View customer:', customer);
  };

  const handleDelete = async (customer: Customer) => {
    if (
      window.confirm(
        `¿Estás seguro de eliminar el cliente "${customer.name}"? Esta acción es irreversible.`
      )
    ) {
      try {
        await deleteMutation.mutateAsync(customer.id);
        alert('Cliente eliminado exitosamente');
      } catch (error) {
        alert('Error al eliminar el cliente');
        console.error(error);
      }
    }
  };

  const handleManageLoyalty = (customer: Customer) => {
    setLoyaltyModalCustomer(customer);
  };

  const handleSubmit = async (data: CreateCustomerDto) => {
    try {
      if (editingCustomer) {
        await updateMutation.mutateAsync({ id: editingCustomer.id, data });
        alert('Cliente actualizado exitosamente');
      } else {
        await createMutation.mutateAsync(data);
        alert('Cliente creado exitosamente');
      }
      setShowForm(false);
      setEditingCustomer(null);
    } catch (error) {
      alert(editingCustomer ? 'Error al actualizar el cliente' : 'Error al crear el cliente');
      console.error(error);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
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
      alert('Puntos actualizados exitosamente');
      setLoyaltyModalCustomer(null);
    } catch (error) {
      alert('Error al actualizar los puntos');
      console.error(error);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestiona tu base de clientes y puntos de lealtad</p>
        </div>
        {!showForm && (
          <Button onClick={handleCreateNew}>
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Cliente
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && !showForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalCustomers}
                </p>
              </div>
              <Users className="w-10 h-10 text-blue-500" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-green-600 font-medium">
                {stats.activeCustomers} activos
              </span>
              <span className="text-sm text-gray-400">•</span>
              <span className="text-sm text-gray-500">
                {stats.inactiveCustomers} inactivos
              </span>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Puntos Totales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalLoyaltyPoints.toLocaleString()}
                </p>
              </div>
              <Award className="w-10 h-10 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Puntos de lealtad acumulados
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Compra Promedio</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.avgPurchaseValue)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Valor promedio por cliente
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Clientes Recientes</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.recentCustomers}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-purple-500" />
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Compraron en últimos 30 días
            </p>
          </Card>
        </div>
      )}

      {/* Form or Table */}
      {showForm ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">
            {editingCustomer ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
          </h2>
          <CustomerForm
            customer={editingCustomer || undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Card>
      ) : (
        <>
          {/* Filters */}
          <CustomerFilters onFilterChange={handleFilterChange} />

          {/* Customers Table */}
          <Card className="overflow-hidden">
            <CustomersTable
              customers={customersData?.data || []}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
              onManageLoyalty={handleManageLoyalty}
              isLoading={isLoading}
            />

            {/* Pagination */}
            {customersData && customersData.total > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Mostrando {((customersData.page - 1) * customersData.pageSize) + 1} -{' '}
                  {Math.min(
                    customersData.page * customersData.pageSize,
                    customersData.total
                  )}{' '}
                  de {customersData.total} clientes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={customersData.page === 1}
                    onClick={() =>
                      setQueryParams((prev) => ({ ...prev, page: prev.page! - 1 }))
                    }
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      customersData.page >=
                      Math.ceil(customersData.total / customersData.pageSize)
                    }
                    onClick={() =>
                      setQueryParams((prev) => ({ ...prev, page: prev.page! + 1 }))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      )}

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
