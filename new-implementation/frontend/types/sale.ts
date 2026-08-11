export interface SaleItem {
  id?: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  company_id: string;
  order_number: string;
  customer_id?: string;
  customer_name?: string;
  user_id: string;
  total_amount: number;
  tax_amount: number;
  discount_amount: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'partial' | 'refunded';
  status: 'draft' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  items: SaleItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateSaleDto {
  customer_id?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
    discount?: number;
    tax_rate?: number;
  }[];
  payment_method: string;
  payment_status?: 'pending' | 'paid' | 'partial';
  discount_amount?: number;
  notes?: string;
}

export interface UpdateSaleDto {
  customer_id?: string;
  payment_method?: string;
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded';
  status?: 'draft' | 'completed' | 'cancelled' | 'refunded';
  notes?: string;
}

export interface SaleQueryParams {
  page?: number;
  pageSize?: number;
  status?: 'draft' | 'completed' | 'cancelled' | 'refunded';
  payment_status?: 'pending' | 'paid' | 'partial' | 'refunded';
  customer_id?: string;
  start_date?: string;
  end_date?: string;
  sortBy?: 'created_at' | 'total_amount' | 'order_number';
  sortOrder?: 'ASC' | 'DESC';
}

export interface SalesResponse {
  data: Sale[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SalesStats {
  totalSales: number;
  totalRevenue: number;
  averageOrderValue: number;
  todaySales: number;
  todayRevenue: number;
  pendingPayments: number;
}

export interface CartItem extends SaleItem {
  product_id: string;
  product_name: string;
  stock_quantity: number;
  image_url?: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  customer_id?: string;
  customer_name?: string;
}

/** Cuerpo de `POST /sales/orders/:id/payments`. */
export interface RecordPaymentDto {
  payment_method: string;
  amount: number;
  notes?: string;
}

/**
 * El pedido ya creado para el carrito actual, mientras su pago sigue pendiente.
 *
 * El cierre de venta son dos llamadas y sólo la segunda cobra. Si la segunda
 * falla, el pedido queda `draft`/`unpaid` y la caja debe reintentar CONTRA ESE
 * MISMO PEDIDO: re-crearlo cobraría dos veces y descontaría stock dos veces (la
 * guarda de exactamente-una-vez del backend es por pedido, así que dos pedidos
 * distintos no la disparan).
 *
 * `total_amount` viaja con el id porque el reintento ya no tiene a mano la
 * respuesta de creación, y `cart.total` NO es sustituto: el backend calcula el
 * IVA por ítem y lo redondea a `decimal(10,2)`, el carrito lo calcula sobre el
 * subtotal agregado. Mandar el del carrito deja el pedido `partially_paid` sin
 * que la caja se entere.
 */
export interface PendingOrder {
  id: string;
  total_amount: number;
}
