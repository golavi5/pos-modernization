'use client';

import { useCallback, useState } from 'react';
import { ProductSearch } from '@/components/sales/ProductSearch';
import { SalesCart } from '@/components/sales/SalesCart';
import { PaymentModal } from '@/components/sales/PaymentModal';
import { useCreateSale, useRecordPayment } from '@/hooks/useSales';
import type { Product } from '@/types/product';
import type { CartItem, Cart, PendingOrder } from '@/types/sale';

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
  // El pedido ya creado para ESTE carrito, mientras su pago sigue pendiente.
  // Ver `PendingOrder` en `types/sale.ts` para por qué existe.
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const createSale = useCreateSale();
  const recordPayment = useRecordPayment();

  // Todo cambio del carrito invalida el pedido pendiente: un pedido creado
  // corresponde a un carrito concreto y lleva su propio `total_amount`.
  // Reintentar contra él después de añadir o quitar un ítem cobraría el total
  // viejo por una compra distinta.
  const applyCart = (next: Cart) => {
    setCart(next);
    setPendingOrder(null);
  };

  const recalc = (items: CartItem[], discount = cart.discount): Cart => {
    const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
    const tax = subtotal * TAX_RATE;
    return { ...cart, items, subtotal, tax, discount, total: subtotal + tax - discount };
  };

  const handleAddProduct = (product: Product) => {
    const canOversell = product.can_sell_without_stock ?? false;
    // `<= 0`, no `=== 0`: 7.809 productos migrados llegan con stock negativo y
    // la comparación estricta no los bloqueaba — se añadían al carrito y el
    // backend devolvía 400 al cobrar.
    if (!canOversell && product.stock_quantity <= 0) return;
    const existing = cart.items.find((i) => i.product_id === product.id);
    let newItems: CartItem[];

    if (existing) {
      if (!canOversell && existing.quantity >= product.stock_quantity) return;
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
          sold_without_stock: product.stock_quantity <= 0,
          image_url: product.image_url,
        },
      ];
    }
    applyCart(recalc(newItems));
  };

  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const newItems = cart.items.map((i) =>
      i.product_id === productId
        ? { ...i, quantity, subtotal: quantity * i.unit_price }
        : i
    );
    applyCart(recalc(newItems));
  };

  const handleRemoveItem = (productId: string) => {
    const newItems = cart.items.filter((i) => i.product_id !== productId);
    applyCart(recalc(newItems));
  };

  const handleSelectCustomer = (customer: { id: string; name: string } | undefined) => {
    applyCart({ ...cart, customer_id: customer?.id, customer_name: customer?.name });
  };

  const handleConfirmPayment = async (paymentMethod: string) => {
    // Crear el pedido no lo cobra: el backend lo deja `draft`/`unpaid` hasta
    // que llega el pago. La segunda llamada es la que CIERRA la venta (mueve
    // el pedido a `completed` y descuenta inventario).
    //
    // Si esa segunda llamada falla, el pedido YA EXISTE y queda pendiente de
    // cobro. El reintento del cajero re-entra por aquí desde arriba, así que
    // sin este `pendingOrder` volvía a crear un pedido: cliente cobrado dos
    // veces, stock descontado dos veces y un `draft` huérfano. La guarda de
    // exactamente-una-vez del backend es POR PEDIDO y no lo habría frenado,
    // porque son dos pedidos distintos. El caso peor es el timeout en el que
    // el pago sí llegó.
    let order = pendingOrder;

    if (!order) {
      const created = await createSale.mutateAsync({
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
      order = { id: created.id, total_amount: created.total_amount };
      setPendingOrder(order);
    }

    // `amount` viene de `order.total_amount` (la respuesta de creación, que el
    // reintento conserva en `pendingOrder`), NO de `cart.total`: el backend
    // calcula el IVA por ítem y redondea a decimal(10,2), mientras
    // `cart.total` lo calcula sobre el subtotal agregado. Son dos leyes de
    // redondeo distintas — enviar `cart.total` puede quedar por debajo del
    // total autoritativo y dejar el pedido en `partially_paid` sin que la caja
    // se entere (o por encima y que el backend rechace el pago con 400).
    await recordPayment.mutateAsync({
      orderId: order.id,
      data: { payment_method: paymentMethod, amount: order.total_amount },
    });

    // Ni se cierra el modal ni se vacía el carrito aquí. Cerrarlo desmontaba
    // `PaymentModal` en el mismo tick en que éste intentaba renderizar su
    // `status === 'success'` (la guarda `if (!isOpen) return null` corta
    // antes), así que la pantalla de confirmación NUNCA se pintaba. Y vaciar
    // el carrito ahora dejaría esa pantalla mostrando $0, porque su `total`
    // sale del carrito. Ambas cosas las dispara ya `onFinished`.
  };

  const handleSaleFinished = useCallback(() => {
    setShowPayment(false);
    setCart(EMPTY_CART);
    setPendingOrder(null);
  }, []);

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
          onClearCart={() => applyCart(EMPTY_CART)}
          onCheckout={() => setShowPayment(true)}
        />
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onFinished={handleSaleFinished}
        // El importe autoritativo en cuanto el pedido existe. `cart.total` lo
        // calcula el cliente sobre el subtotal agregado; el backend suma el IVA
        // por ítem y redondea a decimal(10,2), así que difieren. Mientras la
        // pantalla de éxito era inalcanzable esto no se veía; al hacerla
        // visible pasaría a AFIRMAR como "total cobrado" un número que no se
        // cobró. Antes de crear el pedido no hay otra cosa que mostrar, y ahí
        // `cart.total` es la previsión correcta.
        total={pendingOrder?.total_amount ?? cart.total}
        onConfirm={handleConfirmPayment}
        isLoading={createSale.isPending || recordPayment.isPending}
      />
    </div>
  );
}
