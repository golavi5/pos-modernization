import { Injectable } from '@nestjs/common';
import { CreateOrderItemDto } from '../dto/create-order.dto';
import { OrderItem } from '../entities/order-item.entity';

interface CalculatedOrderItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax_amount: number;
  total: number;
}

@Injectable()
export class OrderCalculationService {
  calculateOrderItemTotals(items: CreateOrderItemDto[]): CalculatedOrderItem[] {
    return items.map((item) => {
      const subtotal = item.quantity * item.unit_price;
      const taxAmount = subtotal * 0.19; // Assuming 19% tax rate
      const total = subtotal + taxAmount;

      return {
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
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
