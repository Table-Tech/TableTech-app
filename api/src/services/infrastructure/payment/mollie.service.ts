import { createMollieClient, PaymentStatus, Payment, PaymentMethod } from '@mollie/api-client';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';
import { ApiError } from '../../../types/errors.js';

export interface CreatePaymentOptions {
  amount: number;
  orderId: string;
  restaurantId: string;
  description?: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResult {
  paymentId: string;
  checkoutUrl: string;
  status: string;
}

export interface WebhookData {
  paymentId: string;
  status: PaymentStatus;
  amount: number;
  metadata?: Record<string, any>;
}

export class MolliePaymentService {
  private static instance: MolliePaymentService;
  private mollieClient: any;
  private prisma: PrismaClient;

  private constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    
    const apiKey = process.env.MOLLIE_API_KEY;
    if (!apiKey) {
      throw new Error('MOLLIE_API_KEY environment variable is required');
    }

    this.mollieClient = createMollieClient({
      apiKey
    });

    logger.base.info({
      category: 'SYSTEM',
      event: 'MOLLIE_INITIALIZED'
    }, 'Mollie payment service initialized');
  }

  public static getInstance(prisma: PrismaClient): MolliePaymentService {
    if (!MolliePaymentService.instance) {
      MolliePaymentService.instance = new MolliePaymentService(prisma);
    }
    return MolliePaymentService.instance;
  }

  /**
   * Create a new payment with Mollie
   */
  public async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    try {
      // Validate order exists and is payable
      const order = await this.prisma.order.findUnique({
        where: { 
          id: options.orderId,
          restaurantId: options.restaurantId
        },
        include: {
          table: true,
          restaurant: true
        }
      });

      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (order.paymentStatus === 'COMPLETED') {
        throw new ApiError(400, 'ORDER_ALREADY_PAID', 'Order is already paid');
      }

      if (order.status === 'CANCELLED') {
        throw new ApiError(400, 'ORDER_CANCELLED', 'Cannot pay for cancelled order');
      }

      // Create payment with Mollie
      const molliePayment = await this.mollieClient.payments.create({
        amount: {
          currency: 'EUR',
          value: options.amount.toFixed(2)
        },
        description: options.description || `Order #${order.orderNumber} - ${order.restaurant.name}`,
        redirectUrl: this.getRedirectUrl(options.orderId),
        webhookUrl: this.getWebhookUrl(),
        metadata: {
          orderId: options.orderId,
          restaurantId: options.restaurantId,
          tableId: order.tableId,
          tableNumber: order.table.number.toString(),
          ...(options.metadata || {})
        },
        method: [
          PaymentMethod.ideal,
          PaymentMethod.creditcard,
          PaymentMethod.bancontact
        ]
      });

      // Store payment in database
      await this.prisma.payment.create({
        data: {
          id: molliePayment.id,
          amount: options.amount,
          method: 'MOLLIE',
          status: 'PENDING',
          transactionId: molliePayment.id,
          orderId: options.orderId
        }
      });

      // Update order with Mollie payment ID
      await this.prisma.order.update({
        where: { id: options.orderId },
        data: { 
          molliePaymentId: molliePayment.id,
          paymentStatus: 'PENDING'
        }
      });

      logger.payment.initiated(
        molliePayment.id,
        options.amount,
        options.orderId
      );

      return {
        paymentId: molliePayment.id,
        checkoutUrl: molliePayment.getCheckoutUrl()!,
        status: molliePayment.status
      };

    } catch (error) {
      logger.error.log(error as Error, { 
        service: 'mollie',
        operation: 'createPayment',
        orderId: options.orderId
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'PAYMENT_CREATION_FAILED', 'Failed to create payment');
    }
  }

  /**
   * Process webhook from Mollie
   */
  public async processWebhook(paymentId: string): Promise<WebhookData> {
    try {
      // Fetch payment from Mollie
      const molliePayment = await this.mollieClient.payments.get(paymentId);
      
      if (!molliePayment) {
        throw new ApiError(404, 'PAYMENT_NOT_FOUND', 'Payment not found');
      }

      const orderId = molliePayment.metadata?.orderId;
      if (!orderId) {
        throw new ApiError(400, 'INVALID_PAYMENT', 'Payment missing order ID');
      }

      // Update payment status in database
      const paymentStatus = this.mapMollieStatus(molliePayment.status);
      
      await this.prisma.$transaction(async (tx) => {
        // Update payment record
        await tx.payment.update({
          where: { id: paymentId },
          data: { 
            status: paymentStatus,
            updatedAt: new Date()
          }
        });

        // Update order payment status
        await tx.order.update({
          where: { id: orderId },
          data: { 
            paymentStatus,
            webhookReceived: true,
            updatedAt: new Date()
          }
        });

        // If payment successful, update order status
        if (paymentStatus === 'COMPLETED') {
          await tx.order.update({
            where: { id: orderId },
            data: { 
              status: 'CONFIRMED' // Payment confirmed, can start preparing
            }
          });
        }
      });

      const amount = parseFloat(molliePayment.amount.value);

      // Log the webhook processing
      if (paymentStatus === 'COMPLETED') {
        logger.payment.completed(
          paymentId,
          amount,
          orderId
        );
      } else if (paymentStatus === 'FAILED') {
        logger.payment.failed(
          paymentId,
          molliePayment.details?.failureReason || 'Unknown failure',
          orderId
        );
      }

      return {
        paymentId,
        status: molliePayment.status,
        amount,
        metadata: molliePayment.metadata
      };

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'mollie',
        operation: 'processWebhook',
        paymentId
      });

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(500, 'WEBHOOK_PROCESSING_FAILED', 'Failed to process webhook');
    }
  }

  /**
   * Get payment status from Mollie
   */
  public async getPaymentStatus(paymentId: string): Promise<{
    status: string;
    isPaid: boolean;
    amount: number;
    method?: string;
  }> {
    try {
      const molliePayment = await this.mollieClient.payments.get(paymentId);
      
      return {
        status: molliePayment.status,
        isPaid: molliePayment.isPaid(),
        amount: parseFloat(molliePayment.amount.value),
        method: molliePayment.method
      };
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'mollie',
        operation: 'getPaymentStatus',
        paymentId
      });
      
      throw new ApiError(500, 'PAYMENT_STATUS_FETCH_FAILED', 'Failed to fetch payment status');
    }
  }

  /**
   * Cancel a payment
   */
  public async cancelPayment(paymentId: string): Promise<void> {
    try {
      const molliePayment = await this.mollieClient.payments.get(paymentId);
      
      if (molliePayment.isCancelable()) {
        await molliePayment.cancel();
        
        // Update database
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: 'FAILED' }
        });

        // Update order
        const orderId = molliePayment.metadata?.orderId;
        if (orderId) {
          await this.prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: 'FAILED' }
          });
        }
      }
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'mollie',
        operation: 'cancelPayment',
        paymentId
      });
      
      throw new ApiError(500, 'PAYMENT_CANCELLATION_FAILED', 'Failed to cancel payment');
    }
  }

  /**
   * Create a refund for a payment
   */
  public async createRefund(paymentId: string, amount?: number, description?: string): Promise<string> {
    try {
      const refundData: any = {
        description: description || 'Order refund'
      };

      if (amount) {
        refundData.amount = {
          currency: 'EUR',
          value: amount.toFixed(2)
        };
      }

      const refund = await this.mollieClient.paymentRefunds.create({
        paymentId,
        ...refundData
      });

      logger.base.info({
        category: 'PAYMENT',
        event: 'REFUND_CREATED',
        paymentId,
        refundId: refund.id,
        amount
      }, 'Refund created');

      return refund.id;
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'mollie',
        operation: 'createRefund',
        paymentId,
        amount
      });
      
      throw new ApiError(500, 'REFUND_CREATION_FAILED', 'Failed to create refund');
    }
  }

  /**
   * Get available payment methods
   */
  public async getPaymentMethods(): Promise<any[]> {
    try {
      const methods = await this.mollieClient.methods.list();
      return methods.map((method: any) => ({
        id: method.id,
        description: method.description,
        image: method.image,
        issuers: method.issuers
      }));
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'mollie',
        operation: 'getPaymentMethods'
      });
      
      return []; // Return empty array on error
    }
  }

  /**
   * Private helper methods
   */
  private mapMollieStatus(mollieStatus: PaymentStatus): 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' {
    switch (mollieStatus) {
      case PaymentStatus.paid:
        return 'COMPLETED';
      case PaymentStatus.failed:
      case PaymentStatus.canceled:
      case PaymentStatus.expired:
        return 'FAILED';
      case 'refunded' as any:
        return 'REFUNDED';
      default:
        return 'PENDING';
    }
  }

  private getRedirectUrl(orderId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/payment/result?orderId=${orderId}`;
  }

  private getWebhookUrl(): string {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    return `${baseUrl}/api/payments/webhook`;
  }

  /**
   * Health check for Mollie API
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.mollieClient.methods.list();
      return true;
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'mollie',
        operation: 'healthCheck'
      });
      return false;
    }
  }
}

// Export factory function
export const createMollieService = (prisma: PrismaClient) => {
  return MolliePaymentService.getInstance(prisma);
};