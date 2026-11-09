'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/useCustomers';
import type { Customer, CreateCustomerDto } from '@/types/customer';
import { apiErrorMessage } from '@/lib/utils';
import { FormError } from '@/components/ui/form-error';
import { CustomerLoyaltySummary } from './CustomerLoyaltySummary';

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
  const [submitError, setSubmitError] = useState('');
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
    setSubmitError('');

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
      setSubmitError(apiErrorMessage(err, tCommon('requestFailed')));
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
          <Label htmlFor="email">
            {tCommon('email')} <span className="text-red-500">*</span>
          </Label>
          {/* Required: customers.email is NOT NULL UNIQUE (the legacy import synthesises one). */}
          <Input
            id="email"
            type="email"
            required
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
      {customer && <CustomerLoyaltySummary customer={customer} />}

      <FormError message={submitError} />

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
