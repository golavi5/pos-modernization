import { Injectable } from '@nestjs/common';
import { CreateOrderItemDto } from '../dto/create-order.dto';

interface CalculatedOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  /** Tasa de IVA (%) aplicada a la línea. */
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

@Injectable()
export class OrderCalculationService {
  /** `taxRateFor` entrega la tasa (%) ya resuelta de cada producto (SPEC-BACK-009); aquí no hay tasa por defecto. */
  calculateOrderItemTotals(
    items: CreateOrderItemDto[],
    taxRateFor: (productId: string) => number,
  ): CalculatedOrderItem[] {
    return items.map((item) => {
      const taxRate = taxRateFor(item.product_id);
      const subtotal = item.quantity * item.unit_price;
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_rate: taxRate,
        subtotal,
        tax_amount: taxAmount,
        total,
      };
    });
  }

  calculateOrderTotals(
    orderItems: CalculatedOrderItem[],
    discountAmount: number = 0,
  ): {
    subtotal: number;
    tax_amount: number;
    total_amount: number;
  } {
    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax_amount = orderItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const total_amount = subtotal + tax_amount - discountAmount;

    return {
      subtotal,
      tax_amount,
      total_amount: Math.max(0, total_amount), // Ensure non-negative total
    };
  }

  calculatePaymentStatus(totalAmount: number, paidAmount: number) {
    if (paidAmount <= 0) {
      return 'unpaid';
    } else if (paidAmount < totalAmount) {
      return 'partially_paid';
    } else {
      return 'paid';
    }
  }
}
