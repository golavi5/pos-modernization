'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import type { Customer, CreateCustomerDto } from '@/types/customer';
import { formatCOP } from '@/lib/utils';

interface CustomerFormProps {
  customer?: Customer;
  /** Form element id — allows an external submit button via `form={formId}` */
  formId?: string;
  /** Called after a successful create/update when using formId mode */
  onSuccess?: () => void;
  /** Legacy: called with form data (used when the page owns the mutation) */
  onSubmit?: (data: CreateCustomerDto) => void | Promise<void>;
  /** Legacy: called on cancel */
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CustomerForm({
  customer,
  formId,
  onSuccess,
  onSubmit,
  onCancel,
  isLoading: isLoadingProp,
}: CustomerFormProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isLoadingInternal = createMutation.isPending || updateMutation.isPending;
  const isLoading = isLoadingProp ?? (formId ? isLoadingInternal : false);
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

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (onSubmit) {
      // Legacy mode: parent owns the mutation
      onSubmit(submitData);
      return;
    }

    // formId/onSuccess mode: component owns the mutation
    try {
      if (customer) {
        await updateMutation.mutateAsync({ id: customer.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }
      onSuccess?.();
    } catch (err) {
      console.error('CustomerForm submit error:', err);
    }
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Nombre */}
        <div className="md:col-span-2">
          <Label htmlFor="name">
            {tAuth('fullName')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder={t('fullNamePlaceholder')}
            required
          />
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email">{tCommon('email')}</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={t('emailPlaceholder')}
          />
          <p className="text-xs text-tertiary mt-1">
            {t('emailHelp')}
          </p>
        </div>

        {/* Teléfono */}
        <div>
          <Label htmlFor="phone">{t('phone')}</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder={t('phonePlaceholder')}
          />
          <p className="text-xs text-tertiary mt-1">
            {t('phoneHelp')}
          </p>
        </div>

        {/* Dirección */}
        <div className="md:col-span-2">
          <Label htmlFor="address">{t('address')}</Label>
          <textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder={t('addressPlaceholder')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-tertiary mt-1">
            {t('addressHelp')}
          </p>
        </div>
      </div>

      {/* Info adicional para edición */}
      {customer && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2">{t('additionalInfo')}</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700">{t('loyaltyPoints')}</span>
              <span className="ml-2 font-semibold text-blue-900">
                {customer.loyalty_points}
              </span>
            </div>
            <div>
              <span className="text-blue-700">{t('totalPurchases')}</span>
              <span className="ml-2 font-semibold text-blue-900">
                {formatCOP(customer.total_purchases)}
              </span>
            </div>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            {t('pointsNote')}
          </p>
        </div>
      )}

      {/* Botones — only shown in legacy (non-formId) mode */}
      {!formId && (
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            {tCommon('cancel')}
          </Button>
          <Button type="submit" disabled={isLoading || !formData.name.trim()}>
            {isLoading ? tCommon('saving') : customer ? tCommon('update') : t('form.create')}
          </Button>
        </div>
      )}
    </form>
  );
}
