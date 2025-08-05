import { createMollieClient, PaymentStatus, Payment, PaymentMethod } from '@mollie/api-client';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../../utils/logger.js';
import { ApiError } from '../../../types/errors.js';
import { generateIdempotencyKey } from '../../../utils/webhook-security.js';

export interface CreatePaymentOptions {
  amount: number;
  orderId: string;
  restaurantId: string;
  description?: string;
  customerEmail?: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string; // Prevent duplicate payments
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
   * Production-ready with fraud detection and idempotency
   */
  public async createPayment(options: CreatePaymentOptions): Promise<PaymentResult> {
    console.log('💳 DEBUG: MollieService.createPayment called with options:', JSON.stringify(options, null, 2));

    try {
      // Generate idempotency key if not provided
      const idempotencyKey = options.idempotencyKey || generateIdempotencyKey(options.orderId, options.amount);
      console.log('💳 DEBUG: Generated idempotency key:', idempotencyKey);

      // Check for duplicate payment attempts
      console.log('💳 DEBUG: Checking for existing payments...');
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          orderId: options.orderId,
          status: { in: ['PENDING', 'COMPLETED'] }
        }
      });

      console.log('💳 DEBUG: Existing payment check result:', existingPayment ? 'found' : 'none');

      if (existingPayment) {
        console.log('💳 DEBUG: Duplicate payment detected, throwing error');
        logger.security.paymentFraudAttempt(existingPayment.id, 'Duplicate payment attempt', {
          orderId: options.orderId,
          existingPaymentId: existingPayment.id,
          idempotencyKey
        });
        throw new ApiError(409, 'PAYMENT_ALREADY_EXISTS', 'Payment already exists for this order');
      }

      // Validate order exists and is payable
      console.log('💳 DEBUG: Validating order exists and is payable...');
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

      console.log('💳 DEBUG: Order lookup result:', order ? {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        status: order.status
      } : 'null');

      if (!order) {
        console.log('💳 DEBUG: Order not found, throwing error');
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      if (order.paymentStatus === 'COMPLETED') {
        console.log('💳 DEBUG: Order already paid, throwing error');
        throw new ApiError(400, 'ORDER_ALREADY_PAID', 'Order is already paid');
      }

      if (order.status === 'CANCELLED') {
        console.log('💳 DEBUG: Order cancelled, throwing error');
        throw new ApiError(400, 'ORDER_CANCELLED', 'Cannot pay for cancelled order');
      }

      // Fraud detection: Check if amount matches order
      const orderAmount = parseFloat(order.totalAmount.toString());
      const amountDiff = Math.abs(orderAmount - options.amount);
      console.log('💳 DEBUG: Amount validation:', {
        orderAmount,
        requestedAmount: options.amount,
        difference: amountDiff
      });

      if (amountDiff > 0.01) {
        console.log('💳 DEBUG: Amount mismatch detected, throwing error');
        logger.security.paymentFraudAttempt('amount_mismatch', 'Payment amount does not match order', {
          orderId: options.orderId,
          orderAmount: order.totalAmount,
          requestedAmount: options.amount
        });
        throw new ApiError(400, 'AMOUNT_MISMATCH', 'Payment amount does not match order total');
      }

      // Create payment with Mollie
      console.log('💳 DEBUG: Creating Mollie payment...');
      const molliePaymentData: any = {
        amount: {
          currency: 'EUR',
          value: options.amount.toFixed(2)
        },
        description: options.description || `Tafel ${order.table.number} - Order #${order.orderNumber} - ${order.restaurant.name}`,
        redirectUrl: this.getRedirectUrl(options.orderId),
        metadata: {
          orderId: options.orderId,
          restaurantId: options.restaurantId,
          tableId: order.tableId,
          tableNumber: order.table.number.toString(),
          idempotencyKey,
          ...(options.metadata || {})
        },
        method: [
          PaymentMethod.ideal,
          PaymentMethod.creditcard,
          PaymentMethod.bancontact
        ]
      };

      // Only add webhook URL in production or if explicitly set
      const webhookUrl = this.getWebhookUrl();
      if (process.env.NODE_ENV === 'production' || process.env.FORCE_WEBHOOK_URL === 'true') {
        molliePaymentData.webhookUrl = webhookUrl;
        console.log('💳 DEBUG: Added webhook URL:', webhookUrl);
      } else {
        console.log('💳 DEBUG: Skipping webhook URL for development environment');
      }

      console.log('💳 DEBUG: Mollie payment data:', JSON.stringify(molliePaymentData, null, 2));

      const molliePayment = await this.mollieClient.payments.create(molliePaymentData);

      console.log('💳 DEBUG: Mollie payment created:', {
        id: molliePayment.id,
        status: molliePayment.status,
        amount: molliePayment.amount,
        checkoutUrl: molliePayment.getCheckoutUrl()
      });

      // Update redirect URL with payment ID for development
      if (process.env.NODE_ENV !== 'production') {
        const updatedRedirectUrl = this.getRedirectUrl(options.orderId, molliePayment.id);
        console.log('💳 DEBUG: Updated redirect URL with payment ID:', updatedRedirectUrl);
        // Note: Mollie doesn't allow updating the redirect URL after creation,
        // so we'll pass the payment ID in the response instead
      }

      let checkoutUrl = molliePayment.getCheckoutUrl()!;

      // For development, we'll modify the checkout URL to include payment ID in redirect
      if (process.env.NODE_ENV !== 'production') {
        const updatedRedirectUrl = encodeURIComponent(this.getRedirectUrl(options.orderId, molliePayment.id));
        // Replace the redirect URL in the checkout URL
        const originalRedirectUrl = encodeURIComponent(this.getRedirectUrl(options.orderId));
        checkoutUrl = checkoutUrl.replace(originalRedirectUrl, updatedRedirectUrl);
        console.log('💳 DEBUG: Modified checkout URL for development:', checkoutUrl);
      }

      // Store payment in database and update order with molliePaymentId
      console.log('💳 DEBUG: Storing payment in database and updating order...');
      await this.prisma.$transaction(async (tx) => {
        // Create payment record
        await tx.payment.create({
          data: {
            id: molliePayment.id,
            amount: options.amount,
            method: 'MOLLIE',
            status: 'PENDING',
            transactionId: molliePayment.id,
            orderId: options.orderId
          }
        });

        // Update order with molliePaymentId
        await tx.order.update({
          where: { id: options.orderId },
          data: { 
            molliePaymentId: molliePayment.id,
            updatedAt: new Date()
          }
        });
      });
      console.log('💳 DEBUG: Payment stored in database and order updated with molliePaymentId');

      logger.payment.initiated(
        molliePayment.id,
        options.amount,
        options.orderId
      );

      const result = {
        paymentId: molliePayment.id,
        checkoutUrl: checkoutUrl,
        status: molliePayment.status
      };

      console.log('💳 DEBUG: Returning payment result:', result);
      return result;

    } catch (error) {
      console.error('💳 DEBUG: Error in createPayment:', error);
      console.error('💳 DEBUG: Error stack:', (error as Error).stack);

      logger.error.log(error as Error, {
        service: 'mollie',
        operation: 'createPayment',
        orderId: options.orderId
      });

      if (error instanceof ApiError) {
        console.log('💳 DEBUG: Rethrowing ApiError');
        throw error;
      }

      console.log('💳 DEBUG: Throwing generic payment creation failed error');
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

        // Update order payment status and ensure molliePaymentId is set
        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus,
            molliePaymentId: paymentId, // Ensure molliePaymentId is always set
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

  private getRedirectUrl(orderId: string, paymentId?: string): string {
    const baseUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:3000';
    let url = `${baseUrl}/client/thankyou?orderId=${orderId}`;
    if (paymentId) {
      url += `&paymentId=${paymentId}`;
    }
    console.log('💳 DEBUG: Generated redirect URL:', url);
    return url;
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