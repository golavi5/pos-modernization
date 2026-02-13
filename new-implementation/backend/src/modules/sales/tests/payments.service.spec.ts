import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../services/payments.service';
import { Payment, PaymentStatus, PaymentMethod } from '../entities/payment.entity';
import { Order, PaymentStatus as OrderPaymentStatus } from '../entities/order.entity';
import { CreatePaymentDto } from '../dto/create-payment.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: Repository<Payment>;
  let orderRepository: Repository<Order>;

  const mockUser = {
    id: 1,
    company_id: 1,
    email: 'test@example.com',
    name: 'Test User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
  });

  describe('recordPayment', () => {
    it('should record payment successfully', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 1000,
        payments: [],
      } as Order;

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CASH,
        amount: 500,
      };

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({
        id: 1,
        order_id: 1,
        ...createPaymentDto,
      } as Payment);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);

      const result = await service.recordPayment(1, createPaymentDto, mockUser);

      expect(result.amount).toBe(500);
      expect(paymentRepository.save).toHaveBeenCalled();
      expect(orderRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CARD,
        amount: 500,
      };

      await expect(service.recordPayment(1, createPaymentDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid payment amount', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 1000,
        payments: [],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CASH,
        amount: -100,
      };

      await expect(service.recordPayment(1, createPaymentDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if payment exceeds remaining balance', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 500,
        payments: [{ amount: 300 } as Payment],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CARD,
        amount: 300, // Exceeds remaining balance of 200
      };

      await expect(service.recordPayment(1, createPaymentDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set payment status to PAID when full payment is made', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 500,
        payment_status: OrderPaymentStatus.UNPAID,
        payments: [],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({} as Payment);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CASH,
        amount: 500,
      };

      await service.recordPayment(1, createPaymentDto, mockUser);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: OrderPaymentStatus.PAID,
        }),
      );
    });

    it('should set payment status to PARTIALLY_PAID for partial payment', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 1000,
        payment_status: OrderPaymentStatus.UNPAID,
        payments: [],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({} as Payment);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CARD,
        amount: 500,
      };

      await service.recordPayment(1, createPaymentDto, mockUser);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: OrderPaymentStatus.PARTIALLY_PAID,
        }),
      );
    });

    it('should enforce multi-tenant isolation', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CASH,
        amount: 500,
      };

      await expect(service.recordPayment(1, createPaymentDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );

      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, company_id: mockUser.company_id },
        }),
      );
    });

    it('should store payment method and transaction id', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 1000,
        payments: [],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({} as Payment);
      jest.spyOn(orderRepository, 'save').mockResolvedValue(mockOrder);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CARD,
        amount: 500,
        transaction_id: 'TXN123456',
      };

      await service.recordPayment(1, createPaymentDto, mockUser);

      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_method: PaymentMethod.CARD,
          transaction_id: 'TXN123456',
        }),
      );
    });
  });

  describe('getPaymentsByOrderId', () => {
    it('should return payments for an order', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
      } as Order;

      const mockPayments = [
        { id: 1, order_id: 1, amount: 500 },
        { id: 2, order_id: 1, amount: 300 },
      ] as Payment[];

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);
      jest.spyOn(paymentRepository, 'find').mockResolvedValue(mockPayments);

      const result = await service.getPaymentsByOrderId(1, mockUser);

      expect(result).toEqual(mockPayments);
      expect(paymentRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { order_id: 1 },
        }),
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPaymentsByOrderId(1, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should enforce multi-tenant isolation in getPaymentsByOrderId', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPaymentsByOrderId(1, mockUser)).rejects.toThrow(NotFoundException);

      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, company_id: mockUser.company_id },
        }),
      );
    });
  });

  describe('refundPayment', () => {
    it('should refund a payment', async () => {
      const mockPayment = {
        id: 1,
        amount: 500,
        status: PaymentStatus.COMPLETED,
        order: { id: 1, company_id: 1, total_amount: 1000 },
      } as Payment;

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(mockPayment);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      });
      jest.spyOn(paymentRepository, 'find').mockResolvedValue([]);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({} as Order);

      const result = await service.refundPayment(1, mockUser);

      expect(result.status).toBe(PaymentStatus.REFUNDED);
      expect(paymentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if payment not found', async () => {
      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(null);

      await expect(service.refundPayment(1, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payment already refunded', async () => {
      const mockPayment = {
        id: 1,
        status: PaymentStatus.REFUNDED,
        order: { id: 1, company_id: 1 },
      } as Payment;

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(mockPayment);

      await expect(service.refundPayment(1, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should update order payment status after refund', async () => {
      const mockPayment = {
        id: 1,
        amount: 500,
        status: PaymentStatus.COMPLETED,
        order: { id: 1, company_id: 1, total_amount: 1000 },
      } as Payment;

      jest.spyOn(paymentRepository, 'findOne').mockResolvedValue(mockPayment);
      jest.spyOn(paymentRepository, 'save').mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.REFUNDED,
      });
      jest.spyOn(paymentRepository, 'find').mockResolvedValue([]);
      jest.spyOn(orderRepository, 'save').mockResolvedValue({} as Order);

      await service.refundPayment(1, mockUser);

      expect(orderRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          payment_status: OrderPaymentStatus.UNPAID,
        }),
      );
    });
  });

  describe('getPaymentSummary', () => {
    it('should return payment summary for an order', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 1000,
        payment_status: OrderPaymentStatus.PARTIALLY_PAID,
        payments: [
          { amount: 300, status: PaymentStatus.COMPLETED } as Payment,
          { amount: 200, status: PaymentStatus.COMPLETED } as Payment,
        ],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await service.getPaymentSummary(1, mockUser);

      expect(result.order_total).toBe(1000);
      expect(result.total_paid).toBe(500);
      expect(result.remaining_balance).toBe(500);
      expect(result.payments_count).toBe(2);
    });

    it('should exclude refunded payments from total paid', async () => {
      const mockOrder = {
        id: 1,
        company_id: 1,
        total_amount: 1000,
        payment_status: OrderPaymentStatus.PARTIALLY_PAID,
        payments: [
          { amount: 500, status: PaymentStatus.COMPLETED } as Payment,
          { amount: 300, status: PaymentStatus.REFUNDED } as Payment,
        ],
      } as Order;

      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(mockOrder);

      const result = await service.getPaymentSummary(1, mockUser);

      expect(result.total_paid).toBe(500);
      expect(result.remaining_balance).toBe(500);
    });

    it('should throw NotFoundException if order not found', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPaymentSummary(1, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Authorization and Security', () => {
    it('should prevent access to payments from different company', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      const createPaymentDto: CreatePaymentDto = {
        payment_method: PaymentMethod.CASH,
        amount: 100,
      };

      await expect(service.recordPayment(1, createPaymentDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should enforce company isolation in getPaymentSummary', async () => {
      jest.spyOn(orderRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getPaymentSummary(1, mockUser)).rejects.toThrow(NotFoundException);

      expect(orderRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, company_id: mockUser.company_id },
        }),
      );
    });
  });
});
