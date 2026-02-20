'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Customer, CreateCustomerDto } from '@/types/customer';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CreateCustomerDto) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading,
}: CustomerFormProps) {
  const [formData, setFormData] = useState<CreateCustomerDto>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
      });
    }
  }, [customer]);

  const handleChange = (field: keyof CreateCustomerDto, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Remove empty optional fields
    const submitData: CreateCustomerDto = {
      name: formData.name,
    };

    if (formData.email && formData.email.trim()) {
      submitData.email = formData.email.trim();
    }
    if (formData.phone && formData.phone.trim()) {
      submitData.phone = formData.phone.trim();
    }
    if (formData.address && formData.address.trim()) {
      submitData.address = formData.address.trim();
    }

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div className="md:col-span-2">
          <Label htmlFor="name">
            Nombre completo <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Ej: Juan Pérez García"
            required
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="ejemplo@correo.com"
          />
          <p className="text-xs text-tertiary mt-1">
            Usado para enviar recibos y notificaciones
          </p>
        </div>

        {/* Teléfono */}
        <div>
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+57 300 123 4567"
          />
          <p className="text-xs text-tertiary mt-1">
            Incluye código de país (+57 para Colombia)
          </p>
        </div>

        {/* Dirección */}
        <div className="md:col-span-2">
          <Label htmlFor="address">Dirección</Label>
          <textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Calle 123 #45-67, Apartamento 8B, Ciudad"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-tertiary mt-1">
            Dirección de envío o facturación
          </p>
        </div>
      </div>

      {/* Info adicional para edición */}
      {customer && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">Información adicional</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Puntos de lealtad:</span>
              <span className="ml-2 font-semibold text-blue-900">
                {customer.loyalty_points}
              </span>
            </div>
            <div>
              <span className="text-blue-700">Total compras:</span>
              <span className="ml-2 font-semibold text-blue-900">
                {new Intl.NumberFormat('es-CO', {
                  style: 'currency',
                  currency: 'COP',
                  minimumFractionDigits: 0,
                }).format(customer.total_purchases)}
              </span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            * Los puntos de lealtad se gestionan desde el botón de acción en la tabla
          </p>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name.trim()}>
          {isLoading ? 'Guardando...' : customer ? 'Actualizar' : 'Crear cliente'}
        </Button>
      </div>
    </form>
  );
}
