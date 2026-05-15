'use client';

import { useState } from 'react';
import { ProductSearch } from '@/components/sales/ProductSearch';
import { SalesCart } from '@/components/sales/SalesCart';
import { PaymentModal } from '@/components/sales/PaymentModal';
import { useCreateSale } from '@/hooks/useSales';
import type { Product } from '@/types/product';
import type { CartItem, Cart } from '@/types/sale';

const TAX_RATE = 0.19;

const EMPTY_CART: Cart = {
  items: [],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
};

export default function SalesPage() {
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [showPayment, setShowPayment] = useState(false);
  const createSale = useCreateSale();

  const recalc = (items: CartItem[], discount = cart.discount): Cart => {
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const tax = subtotal * TAX_RATE;
    return { ...cart, items, subtotal, tax, discount, total: subtotal + tax - discount };
  };

  const handleAddProduct = (product: Product) => {
    if (product.stock_quantity === 0) return;
    const existing = cart.items.find((i) => i.product_id === product.id);
    let newItems: CartItem[];

    if (existing) {
      if (existing.quantity >= product.stock_quantity) return;
      newItems = cart.items.map((i) =>
        i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
          : i
      );
    } else {
      newItems = [
        ...cart.items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: product.price,
          tax_rate: product.tax_rate ?? TAX_RATE * 100,
          subtotal: product.price,
          stock_quantity: product.stock_quantity,
          image_url: product.image_url,
        },
      ];
    }
    setCart(recalc(newItems));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const newItems = cart.items.map((i) =>
      i.product_id === productId
        ? { ...i, quantity, subtotal: quantity * i.unit_price }
        : i
    );
    setCart(recalc(newItems));
  };

  const handleRemoveItem = (productId: string) => {
    const newItems = cart.items.filter((i) => i.product_id !== productId);
    setCart(recalc(newItems));
  };

  const handleSelectCustomer = (customer: { id: string; name: string } | undefined) => {
    setCart({ ...cart, customer_id: customer?.id, customer_name: customer?.name });
  };

  const handleConfirmPayment = async (paymentMethod: string) => {
    await createSale.mutateAsync({
      customer_id: cart.customer_id,
      items: cart.items.map((i) => ({
        product_id: i.product_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        discount: i.discount ?? 0,
        tax_rate: i.tax_rate ?? TAX_RATE * 100,
      })),
      payment_method: paymentMethod,
      payment_status: 'paid',
      discount_amount: cart.discount,
    });
    setShowPayment(false);
    setCart(EMPTY_CART);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Product grid */}
      <div className="flex-1 overflow-hidden p-4">
        <ProductSearch onAddProduct={handleAddProduct} />
      </div>

      {/* Cart panel */}
      <div className="w-[280px] shrink-0 border-l border-border bg-card flex flex-col overflow-hidden">
        <SalesCart
          items={cart.items}
          subtotal={cart.subtotal}
          tax={cart.tax}
          discount={cart.discount}
          total={cart.total}
          customerId={cart.customer_id}
          customerName={cart.customer_name}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onSelectCustomer={handleSelectCustomer}
          onClearCart={() => setCart(EMPTY_CART)}
          onCheckout={() => setShowPayment(true)}
        />
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        total={cart.total}
        onConfirm={handleConfirmPayment}
        isLoading={createSale.isPending}
      />
    </div>
  );
}
