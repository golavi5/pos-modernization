'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToolbar } from '@/components/layout/ToolbarContext';
import {
  useSettings,
  useUpdateCompany,
  useUpdateTax,
  useUpdatePaymentMethods,
  useUpdateInventorySettings,
  useUpdateSalesSettings,
  useUpdateLoyaltySettings,
  useResetSettings,
} from '@/hooks/useSettings';
import {
  Building2, CreditCard, Package, ShoppingCart, Star, Receipt, RotateCcw, Save
} from 'lucide-react';

type SectionId = 'company' | 'tax' | 'payments' | 'inventory' | 'sales' | 'loyalty';

const SECTIONS: { id: SectionId; label: string; icon: React.ReactNode }[] = [
  { id: 'company',   label: 'Empresa',       icon: <Building2 className="h-4 w-4" /> },
  { id: 'tax',       label: 'Impuestos',      icon: <Receipt className="h-4 w-4" /> },
  { id: 'payments',  label: 'Pagos',          icon: <CreditCard className="h-4 w-4" /> },
  { id: 'inventory', label: 'Inventario',     icon: <Package className="h-4 w-4" /> },
  { id: 'sales',     label: 'Ventas',         icon: <ShoppingCart className="h-4 w-4" /> },
  { id: 'loyalty',   label: 'Fidelización',   icon: <Star className="h-4 w-4" /> },
];

// Reusable toggle component
function Toggle({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      type="button"
      id={id}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-600' : 'bg-gray-300'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  );
}

// Section wrapper
function Section({ title, description, children, onSave, saving }: {
  title: string; description: string; children: React.ReactNode;
  onSave: () => void; saving: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={onSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>('company');
  const [saved, setSaved] = useState('');
  const { setToolbar } = useToolbar();

  useEffect(() => {
    setToolbar({ title: 'Configuración' });
  }, [setToolbar]);

  const { data: settings, isLoading } = useSettings();
  const updateCompany   = useUpdateCompany();
  const updateTax       = useUpdateTax();
  const updatePayments  = useUpdatePaymentMethods();
  const updateInventory = useUpdateInventorySettings();
  const updateSales     = useUpdateSalesSettings();
  const updateLoyalty   = useUpdateLoyaltySettings();
  const reset           = useResetSettings();

  // Local form state (initialized from server)
  const [company, setCompany] = useState({ companyName: '', nit: '', address: '', phone: '', email: '', website: '', city: '', country: '' });
  const [tax, setTax] = useState({ taxRate: 19, taxIncludedInPrice: true, currency: 'COP', locale: 'es-CO' });
  const [payments, setPayments] = useState({ paymentCash: true, paymentCard: true, paymentTransfer: true, paymentCredit: false, paymentTransferInstructions: '' });
  const [inventory, setInventory] = useState({ trackInventory: true, allowNegativeStock: false, defaultReorderPoint: 5 });
  const [sales, setSales] = useState({ requireCustomer: false, printReceiptAutomatically: false, receiptFooter: '', largeSaleThreshold: 500000 });
  const [loyalty, setLoyalty] = useState({ loyaltyEnabled: true, loyaltyPointsPerCurrency: 1, loyaltyPointValue: 0.01 });

  // Populate from server
  useEffect(() => {
    if (!settings) return;
    setCompany({ companyName: settings.companyName, nit: settings.nit || '', address: settings.address || '', phone: settings.phone || '', email: settings.email || '', website: settings.website || '', city: settings.city || '', country: settings.country || '' });
    setTax({ taxRate: settings.taxRate, taxIncludedInPrice: settings.taxIncludedInPrice, currency: settings.currency, locale: settings.locale });
    setPayments({ paymentCash: settings.paymentCash, paymentCard: settings.paymentCard, paymentTransfer: settings.paymentTransfer, paymentCredit: settings.paymentCredit, paymentTransferInstructions: settings.paymentTransferInstructions || '' });
    setInventory({ trackInventory: settings.trackInventory, allowNegativeStock: settings.allowNegativeStock, defaultReorderPoint: settings.defaultReorderPoint });
    setSales({ requireCustomer: settings.requireCustomer, printReceiptAutomatically: settings.printReceiptAutomatically, receiptFooter: settings.receiptFooter || '', largeSaleThreshold: settings.largeSaleThreshold });
    setLoyalty({ loyaltyEnabled: settings.loyaltyEnabled, loyaltyPointsPerCurrency: settings.loyaltyPointsPerCurrency, loyaltyPointValue: settings.loyaltyPointValue });
  }, [settings]);

  const notifySaved = (section: string) => {
    setSaved(section);
    setTimeout(() => setSaved(''), 2500);
  };

  const handleSave = async (section: SectionId) => {
    switch (section) {
      case 'company':   await updateCompany.mutateAsync(company); break;
      case 'tax':       await updateTax.mutateAsync(tax); break;
      case 'payments':  await updatePayments.mutateAsync(payments); break;
      case 'inventory': await updateInventory.mutateAsync(inventory); break;
      case 'sales':     await updateSales.mutateAsync(sales); break;
      case 'loyalty':   await updateLoyalty.mutateAsync(loyalty); break;
    }
    notifySaved(section);
  };

  const isSaving = (section: SectionId) => {
    const map: Record<SectionId, boolean> = {
      company: updateCompany.isPending,
      tax: updateTax.isPending,
      payments: updatePayments.isPending,
      inventory: updateInventory.isPending,
      sales: updateSales.isPending,
      loyalty: updateLoyalty.isPending,
    };
    return map[section];
  };

  // Helper: text field row
  const field = (label: string, id: string, value: string, onChange: (v: string) => void, type = 'text') => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="sm:col-span-2">
        <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );

  // Helper: number field row
  const numField = (label: string, id: string, value: number, onChange: (v: number) => void, step = 1, min = 0) => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
      <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
      <div className="sm:col-span-2">
        <Input id={id} type="number" step={step} min={min} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
      </div>
    </div>
  );

  // Helper: toggle row
  const toggleRow = (label: string, description: string, id: string, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="font-medium text-sm">{label}</p>
        {description && <p className="text-xs text-tertiary">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} id={id} />
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gray-100 rounded w-64" />
        <div className="h-64 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-secondary mt-1">Ajusta los parámetros de tu sistema POS</p>
        </div>
        <Button
          variant="outline"
          className="text-red-600 hover:text-red-700 border-red-200"
          onClick={() => confirm('¿Restaurar configuración a valores por defecto?') && reset.mutate()}
          disabled={reset.isPending}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Restaurar defaults
        </Button>
      </div>

      {/* Saved toast */}
      {saved && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          ✅ Configuración guardada
        </div>
      )}

      {/* Section tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {SECTIONS.map((sec) => (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeSection === sec.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-tertiary hover:text-secondary hover:border-gray-300'
              }`}
            >
              {sec.icon}
              {sec.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── EMPRESA ─────────────────────────────────── */}
      {activeSection === 'company' && (
        <Section title="Información de la empresa" description="Datos que aparecerán en recibos y facturas"
          onSave={() => handleSave('company')} saving={isSaving('company')}>
          {field('Nombre empresa', 'companyName', company.companyName, (v) => setCompany((p) => ({ ...p, companyName: v })))}
          {field('NIT / RUT', 'nit', company.nit, (v) => setCompany((p) => ({ ...p, nit: v })))}
          {field('Dirección', 'address', company.address, (v) => setCompany((p) => ({ ...p, address: v })))}
          {field('Teléfono', 'phone', company.phone, (v) => setCompany((p) => ({ ...p, phone: v })), 'tel')}
          {field('Email', 'email', company.email, (v) => setCompany((p) => ({ ...p, email: v })), 'email')}
          {field('Sitio web', 'website', company.website, (v) => setCompany((p) => ({ ...p, website: v })))}
          {field('Ciudad', 'city', company.city, (v) => setCompany((p) => ({ ...p, city: v })))}
          {field('País', 'country', company.country, (v) => setCompany((p) => ({ ...p, country: v })))}
        </Section>
      )}

      {/* ── IMPUESTOS ────────────────────────────────── */}
      {activeSection === 'tax' && (
        <Section title="Impuestos y moneda" description="Configura el IVA y la moneda de tu país"
          onSave={() => handleSave('tax')} saving={isSaving('tax')}>
          {numField('IVA (%)', 'taxRate', tax.taxRate, (v) => setTax((p) => ({ ...p, taxRate: v })), 0.5, 0)}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <Label htmlFor="currency" className="text-sm font-medium">Moneda</Label>
            <div className="sm:col-span-2">
              <select
                id="currency"
                value={tax.currency}
                onChange={(e) => setTax((p) => ({ ...p, currency: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="COP">COP - Peso colombiano</option>
                <option value="USD">USD - Dólar americano</option>
                <option value="EUR">EUR - Euro</option>
                <option value="MXN">MXN - Peso mexicano</option>
                <option value="PEN">PEN - Sol peruano</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <Label className="text-sm font-medium">Locale</Label>
            <div className="sm:col-span-2">
              <select
                value={tax.locale}
                onChange={(e) => setTax((p) => ({ ...p, locale: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="es-CO">es-CO (Colombia)</option>
                <option value="es-MX">es-MX (México)</option>
                <option value="es-PE">es-PE (Perú)</option>
                <option value="en-US">en-US (EE.UU.)</option>
              </select>
            </div>
          </div>
          {toggleRow('IVA incluido en precio', 'Los precios ya incluyen el impuesto', 'taxIncluded',
            tax.taxIncludedInPrice, (v) => setTax((p) => ({ ...p, taxIncludedInPrice: v })))}
        </Section>
      )}

      {/* ── PAGOS ────────────────────────────────────── */}
      {activeSection === 'payments' && (
        <Section title="Métodos de pago" description="Activa los métodos que acepta tu negocio"
          onSave={() => handleSave('payments')} saving={isSaving('payments')}>
          {toggleRow('Efectivo', 'Pago en efectivo', 'cash', payments.paymentCash, (v) => setPayments((p) => ({ ...p, paymentCash: v })))}
          {toggleRow('Tarjeta', 'Débito o crédito con dataphone', 'card', payments.paymentCard, (v) => setPayments((p) => ({ ...p, paymentCard: v })))}
          {toggleRow('Transferencia', 'Transferencia bancaria / PSE', 'transfer', payments.paymentTransfer, (v) => setPayments((p) => ({ ...p, paymentTransfer: v })))}
          {toggleRow('Crédito', 'Venta a crédito / fiado', 'credit', payments.paymentCredit, (v) => setPayments((p) => ({ ...p, paymentCredit: v })))}
          {payments.paymentTransfer && (
            <div className="space-y-1 pt-2">
              <Label htmlFor="transferInstructions" className="text-sm font-medium">
                Instrucciones de transferencia
              </Label>
              <textarea
                id="transferInstructions"
                value={payments.paymentTransferInstructions}
                onChange={(e) => setPayments((p) => ({ ...p, paymentTransferInstructions: e.target.value }))}
                placeholder="Ej: Banco Bogotá, cta 123456789, a nombre de Mi Empresa SAS"
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          )}
        </Section>
      )}

      {/* ── INVENTARIO ───────────────────────────────── */}
      {activeSection === 'inventory' && (
        <Section title="Inventario" description="Controla cómo se gestiona el stock"
          onSave={() => handleSave('inventory')} saving={isSaving('inventory')}>
          {toggleRow('Rastrear inventario', 'Controla el stock de productos', 'trackInv', inventory.trackInventory, (v) => setInventory((p) => ({ ...p, trackInventory: v })))}
          {toggleRow('Permitir stock negativo', 'Permite ventas cuando stock es 0', 'negStock', inventory.allowNegativeStock, (v) => setInventory((p) => ({ ...p, allowNegativeStock: v })))}
          {numField('Punto de reorden por defecto', 'defaultReorder', inventory.defaultReorderPoint, (v) => setInventory((p) => ({ ...p, defaultReorderPoint: v })))}
        </Section>
      )}

      {/* ── VENTAS ───────────────────────────────────── */}
      {activeSection === 'sales' && (
        <Section title="Ventas" description="Configura el comportamiento del punto de venta"
          onSave={() => handleSave('sales')} saving={isSaving('sales')}>
          {toggleRow('Requerir cliente', 'Obliga seleccionar un cliente en cada venta', 'reqCustomer', sales.requireCustomer, (v) => setSales((p) => ({ ...p, requireCustomer: v })))}
          {toggleRow('Imprimir recibo automáticamente', 'Imprime al confirmar pago', 'printAuto', sales.printReceiptAutomatically, (v) => setSales((p) => ({ ...p, printReceiptAutomatically: v })))}
          {numField('Umbral venta grande ($)', 'largeThreshold', sales.largeSaleThreshold, (v) => setSales((p) => ({ ...p, largeSaleThreshold: v })), 10000)}
          <div className="space-y-1">
            <Label htmlFor="receiptFooter" className="text-sm font-medium">Pie de recibo</Label>
            <textarea
              id="receiptFooter"
              value={sales.receiptFooter}
              onChange={(e) => setSales((p) => ({ ...p, receiptFooter: e.target.value }))}
              placeholder="Ej: Gracias por su compra. No se aceptan devoluciones después de 3 días."
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </Section>
      )}

      {/* ── FIDELIZACIÓN ─────────────────────────────── */}
      {activeSection === 'loyalty' && (
        <Section title="Programa de fidelización" description="Configura los puntos de lealtad para clientes"
          onSave={() => handleSave('loyalty')} saving={isSaving('loyalty')}>
          {toggleRow('Habilitar programa de puntos', 'Los clientes acumulan puntos en cada compra', 'loyaltyOn', loyalty.loyaltyEnabled, (v) => setLoyalty((p) => ({ ...p, loyaltyEnabled: v })))}
          {loyalty.loyaltyEnabled && (
            <>
              {numField('Puntos por $ gastado', 'pointsPerCurrency', loyalty.loyaltyPointsPerCurrency, (v) => setLoyalty((p) => ({ ...p, loyaltyPointsPerCurrency: v })), 0.1, 0)}
              {numField('Valor de 1 punto ($)', 'pointValue', loyalty.loyaltyPointValue, (v) => setLoyalty((p) => ({ ...p, loyaltyPointValue: v })), 0.001, 0)}
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                💡 Con esta configuración: compra de $10,000 genera{' '}
                <strong>{(10000 * loyalty.loyaltyPointsPerCurrency).toLocaleString('es-CO')} puntos</strong>
                {' '}equivalentes a{' '}
                <strong>${(10000 * loyalty.loyaltyPointsPerCurrency * loyalty.loyaltyPointValue).toLocaleString('es-CO')}</strong>
              </div>
            </>
          )}
        </Section>
      )}
    </div>
  );
}
