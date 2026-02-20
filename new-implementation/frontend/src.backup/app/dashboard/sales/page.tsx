'use client';

import { useState } from 'react';
import { ShoppingCart, Receipt, TrendingUp, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SalesCart } from '@/components/sales/SalesCart';
import { ProductSearch } from '@/components/sales/ProductSearch';
import { CustomerSelect } from '@/components/sales/CustomerSelect';
import { PaymentModal } from '@/components/sales/PaymentModal';
import { useCreateSale, useSalesStats } from '@/hooks/useSales';
import type { Product } from '@/types/product';
import type { CartItem, Cart } from '@/types/sale';

export default function SalesPage() {
  const [cart, setCart] = useState<Cart>({
    items: [],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
  });
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { data: stats } = useSalesStats();
  const createSaleMutation = useCreateSale();

  const TAX_RATE = 0.19; // 19% IVA

  const calculateTotals = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = subtotal * TAX_RATE;
    const total = subtotal + tax - cart.discount;

    return { subtotal, tax, total };
  };

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity === 0) {
      alert('Producto sin stock');
      return;
    }

    const existingItem = cart.items.find(
      (item) => item.product_id === product.id
    );

    let newItems: CartItem[];

    if (existingItem) {
      if (existingItem.quantity >= product.stock_quantity) {
        alert('No hay suficiente stock');
        return;
      }
      newItems = cart.items.map((item) =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
              subtotal: (item.quantity + 1) * item.unit_price,
            }
          : item
      );
    } else {
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: product.price,
        tax_rate: product.tax_rate || TAX_RATE * 100,
        subtotal: product.price,
        stock_quantity: product.stock_quantity,
        image_url: product.image_url,
      };
      newItems = [...cart.items, newItem];
    }

    const totals = calculateTotals(newItems);
    setCart({ ...cart, items: newItems, ...totals });
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;

    const newItems = cart.items.map((item) =>
      item.product_id === productId
        ? {
            ...item,
            quantity,
            subtotal: quantity * item.unit_price,
          }
        : item
    );

    const totals = calculateTotals(newItems);
    setCart({ ...cart, items: newItems, ...totals });
  };

  const handleRemoveItem = (productId: string) => {
    const newItems = cart.items.filter((item) => item.product_id !== productId);
    const totals = calculateTotals(newItems);
    setCart({ ...cart, items: newItems, ...totals });
  };

  const handleSelectCustomer = (
    customer: { id: string; name: string } | undefined
  ) => {
    setCart({
      ...cart,
      customer_id: customer?.id,
      customer_name: customer?.name,
    });
  };

  const handleCheckout = () => {
    if (cart.items.length === 0) {
      alert('El carrito está vacío');
      return;
    }
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = async (
    paymentMethod: string,
    notes?: string
  ) => {
    try {
      const saleData = {
        customer_id: cart.customer_id,
        items: cart.items.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount: item.discount || 0,
          tax_rate: item.tax_rate || TAX_RATE * 100,
        })),
        payment_method: paymentMethod,
        payment_status: 'paid' as const,
        discount_amount: cart.discount,
        notes,
      };

      await createSaleMutation.mutateAsync(saleData);

      alert('Venta completada exitosamente');
      setShowPaymentModal(false);
      // Reset cart
      setCart({
        items: [],
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
      });
    } catch (error) {
      alert('Error al procesar la venta');
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
        <p className="text-gray-500 mt-1">Gestiona tus ventas y checkout</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ventas Hoy</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.todaySales}
                </p>
              </div>
              <ShoppingCart className="w-10 h-10 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.todayRevenue)}
                </p>
              </div>
              <DollarSign className="w-10 h-10 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Ventas</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stats.totalSales}
                </p>
              </div>
              <Receipt className="w-10 h-10 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ticket Promedio</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(stats.averageOrderValue)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left side - Product search and customer */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product search */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Buscar Productos</h2>
            <ProductSearch onAddProduct={handleAddProduct} />
          </Card>

          {/* Customer selection */}
          <CustomerSelect
            selectedCustomer={
              cart.customer_id && cart.customer_name
                ? { id: cart.customer_id, name: cart.customer_name }
                : undefined
            }
            onSelect={handleSelectCustomer}
          />
        </div>

        {/* Right side - Cart */}
        <div className="space-y-4">
          <div className="lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Carrito ({cart.items.length})
            </h2>

            <div className="space-y-4">
              <SalesCart
                items={cart.items}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                subtotal={cart.subtotal}
                tax={cart.tax}
                discount={cart.discount}
                total={cart.total}
              />

              <Button
                onClick={handleCheckout}
                disabled={cart.items.length === 0}
                className="w-full"
                size="lg"
              >
                Procesar Venta
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={cart.total}
        onConfirm={handleConfirmPayment}
        isLoading={createSaleMutation.isPending}
      />
    </div>
  );
}
