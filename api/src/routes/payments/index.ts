import { FastifyInstance } from 'fastify';
import { createMollieService } from '../../services/infrastructure/payment/mollie.service.js';
import { 
  CreatePaymentSchema, 
  PaymentStatusSchema, 
  CreateRefundSchema,
  WebhookPayloadSchema,
  CreatePaymentInput,
  PaymentStatusInput,
  CreateRefundInput,
  WebhookPayloadInput
} from '../../schemas/payment.schema.js';
import { z } from 'zod';
import { verifyMollieWebhookSignature } from '../../utils/webhook-security.js';
import { RedisRateLimiter } from '../../utils/redis-rate-limiter.js';
import { logger } from '../../utils/logger.js';
import { ApiError } from '../../types/errors.js';
import { validationMiddleware, validateParams } from '../../middleware/validation.middleware.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  const mollieService = createMollieService(fastify.prisma);
  const rateLimiter = RedisRateLimiter.getInstance();

  // Create payment for existing order - PRODUCTION SECURE with Redis rate limiting
  fastify.post('/create', {
    preHandler: [validationMiddleware(CreatePaymentSchema)]
  }, async (request, reply) => {
    const requestLogger = logger.base.child({
      requestId: request.id,
      ip: request.ip,
      operation: 'create_payment'
    });

    try {
      // Redis-based rate limiting check
      const rateLimitKey = RedisRateLimiter.generateKey(request.ip, 'payment-create');
      const rateLimit = await rateLimiter.checkRateLimit(rateLimitKey, 5, 60); // 5 requests per minute

      if (!rateLimit.allowed) {
        return reply.status(429).send({
          error: 'Too many payment requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }

      const { orderId, amount, description, customerEmail, metadata } = request.body as CreatePaymentInput;
      
      // Get restaurant context (you'll need to implement this based on your auth)
      const restaurantId = (request as any).user?.restaurantId || request.headers['x-restaurant-context'] as string;
      
      if (!restaurantId) {
        throw new ApiError(400, 'MISSING_RESTAURANT_CONTEXT', 'Restaurant context is required');
      }

      requestLogger.info({ orderId, amount, restaurantId }, 'Creating payment');

      const payment = await mollieService.createPayment({
        orderId,
        amount,
        restaurantId,
        description,
        customerEmail,
        metadata
      });
      
      requestLogger.info({ paymentId: payment.paymentId, orderId }, 'Payment created successfully');
      
      return { success: true, ...payment };
    } catch (error) {
      requestLogger.error({ error: (error as Error).message }, 'Payment creation failed');
      
      if (error instanceof ApiError) {
        return reply.status(error.statusCode).send({ 
          error: error.message, 
          code: error.code 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Payment creation failed',
        code: 'INTERNAL_ERROR' 
      });
    }
  });

  // Check and update payment status (for development without webhooks)
  fastify.post('/check-status', {
    preHandler: [validationMiddleware(z.object({
      paymentId: z.string().min(1, 'Payment ID is required')
    }))]
  }, async (request, reply) => {
    const requestLogger = logger.base.child({
      requestId: request.id,
      ip: request.ip,
      operation: 'check_payment_status'
    });

    try {
      const { paymentId } = request.body as { paymentId: string };
      
      console.log('🔄 DEBUG: Checking payment status for:', paymentId);
      
      // Get payment status from Mollie
      const status = await mollieService.getPaymentStatus(paymentId);
      console.log('🔄 DEBUG: Payment status from Mollie:', status);
      
      // If payment is completed, process it like a webhook
      if (status.isPaid) {
        console.log('🔄 DEBUG: Payment is paid, processing as webhook...');
        const webhookData = await mollieService.processWebhook(paymentId);
        console.log('🔄 DEBUG: Webhook processing result:', webhookData);
      }
      
      return { success: true, ...status };
    } catch (error) {
      requestLogger.error({ error: (error as Error).message }, 'Payment status check failed');
      
      if (error instanceof ApiError) {
        return reply.status(error.statusCode).send({ 
          error: error.message, 
          code: error.code 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Status check failed',
        code: 'INTERNAL_ERROR' 
      });
    }
  });

  // Create payment with order - Creates order first, then payment
  fastify.post('/create-with-order', {
    preHandler: [validationMiddleware(z.object({
      tableCode: z.string().min(1).max(10),
      items: z.array(z.object({
        menuId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
        modifiers: z.array(z.string().uuid()).optional(),
        notes: z.string().max(200).optional()
      })).min(1).max(20),
      customerName: z.string().min(1).max(100).optional(),
      customerPhone: z.string().optional(),
      notes: z.string().max(200).optional(),
      description: z.string().optional(),
      customerEmail: z.string().email().optional()
    }))]
  }, async (request, reply) => {
    const requestLogger = logger.base.child({
      requestId: request.id,
      ip: request.ip,
      operation: 'create_payment_with_order'
    });

    console.log('🚀 DEBUG: Payment with order endpoint hit');
    console.log('🚀 DEBUG: Request body:', JSON.stringify(request.body, null, 2));

    try {
      // Rate limiting
      console.log('🚀 DEBUG: Checking rate limit...');
      const rateLimitKey = RedisRateLimiter.generateKey(request.ip, 'payment-with-order');
      const rateLimit = await rateLimiter.checkRateLimit(rateLimitKey, 3, 60); // 3 requests per minute

      if (!rateLimit.allowed) {
        console.log('🚀 DEBUG: Rate limit exceeded');
        return reply.status(429).send({
          error: 'Too many payment requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
        });
      }

      console.log('🚀 DEBUG: Rate limit passed');

      const { tableCode, items, customerName, customerPhone, notes, description, customerEmail } = request.body as any;
      
      console.log('🚀 DEBUG: Extracted data:', { tableCode, itemCount: items.length, customerName, customerPhone, notes, description, customerEmail });
      
      requestLogger.info({ tableCode, itemCount: items.length }, 'Creating order and payment');

      // Import OrderService
      console.log('🚀 DEBUG: Importing OrderService...');
      const { OrderService } = await import('../../services/order.service.js');
      const orderService = new OrderService();
      console.log('🚀 DEBUG: OrderService imported successfully');

      // 1. Create the order first
      console.log('🚀 DEBUG: Creating customer order...');
      console.log('🚀 DEBUG: Order payload:', {
        tableCode,
        items,
        customerName,  
        customerPhone,
        notes
      });

      const order = await orderService.createCustomerOrder({
        tableCode,
        items,
        customerName,  
        customerPhone,
        notes
      }, undefined, request);

      console.log('🚀 DEBUG: Order created successfully:', { 
        orderId: order.id, 
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        restaurantId: order.restaurantId
      });

      requestLogger.info({ orderId: order.id, orderNumber: order.orderNumber }, 'Order created, creating payment');

      // 2. Create payment for the order
      console.log('🚀 DEBUG: Creating Mollie payment...');
      const paymentData = {
        orderId: order.id,
        amount: Number(order.totalAmount),
        restaurantId: order.restaurantId,
        description: description || `Order #${order.orderNumber}`,
        customerEmail,
        metadata: {
          orderNumber: order.orderNumber,
          tableCode
        }
      };
      console.log('🚀 DEBUG: Payment data:', paymentData);

      const payment = await mollieService.createPayment(paymentData);
      
      console.log('🚀 DEBUG: Payment created successfully:', { 
        paymentId: payment.paymentId, 
        checkoutUrl: payment.checkoutUrl,
        status: payment.status
      });

      requestLogger.info({ 
        paymentId: payment.paymentId, 
        orderId: order.id,
        orderNumber: order.orderNumber 
      }, 'Payment created successfully');
      
      const response = { 
        success: true, 
        orderId: order.id,
        orderNumber: order.orderNumber,
        paymentId: payment.paymentId,
        checkoutUrl: payment.checkoutUrl
      };

      console.log('🚀 DEBUG: Sending response:', response);
      return response;

    } catch (error) {
      console.error('🚀 DEBUG: ERROR in payment with order creation:', error);
      console.error('🚀 DEBUG: Error stack:', (error as Error).stack);
      console.error('🚀 DEBUG: Error message:', (error as Error).message);
      console.error('🚀 DEBUG: Error name:', (error as Error).name);
      
      requestLogger.error({ error: (error as Error).message }, 'Payment with order creation failed');
      
      if (error instanceof ApiError) {
        console.log('🚀 DEBUG: ApiError detected:', { statusCode: error.statusCode, code: error.code, message: error.message });
        return reply.status(error.statusCode).send({ 
          error: error.message, 
          code: error.code 
        });
      }
      
      console.log('🚀 DEBUG: Generic error, sending 500');
      return reply.status(500).send({ 
        error: 'Payment creation failed',
        code: 'INTERNAL_ERROR' 
      });
    }
  });

  // Webhook endpoint - PRODUCTION SECURE with signature verification
  fastify.post('/webhook', {
    config: {
      rawBody: true // Enable raw body for signature verification
    },
    preHandler: [validationMiddleware(WebhookPayloadSchema)]
  }, async (request, reply) => {
    const webhookLogger = logger.base.child({
      requestId: request.id,
      ip: request.ip,
      operation: 'webhook_processing'
    });

    try {
      // CRITICAL: Verify webhook signature to prevent fake requests
      const signature = request.headers['x-mollie-signature'] as string;
      const rawBody = (request as any).rawBody || JSON.stringify(request.body);
      
      if (!verifyMollieWebhookSignature(rawBody, signature)) {
        webhookLogger.error({ signature: signature?.substring(0, 8) + '...' }, 'Invalid webhook signature');
        return reply.status(401).send({ error: 'Unauthorized webhook request' });
      }

      const { id: paymentId } = request.body as WebhookPayloadInput;
      webhookLogger.info({ paymentId }, 'Processing verified webhook');

      // Process the webhook
      const webhookData = await mollieService.processWebhook(paymentId);
      
      // Send real-time updates via WebSocket if available
      if (global.wsService) {
        try {
          global.wsService.emitPaymentUpdate({
            paymentId,
            orderId: webhookData.metadata?.orderId,
            status: webhookData.status,
            amount: webhookData.amount
          });
        } catch (wsError) {
          webhookLogger.warn({ error: (wsError as Error).message }, 'Failed to send WebSocket update');
        }
      }

      webhookLogger.info({ paymentId, status: webhookData.status }, 'Webhook processed successfully');
      return reply.status(200).send('OK');
      
    } catch (error) {
      webhookLogger.error({ 
        error: (error as Error).message,
        paymentId: (request.body as any)?.id 
      }, 'Webhook processing failed');
      
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  // Check payment status - PRODUCTION SECURE
  fastify.get('/status/:paymentId', {
    preHandler: [validateParams(PaymentStatusSchema)]
  }, async (request, reply) => {
    const statusLogger = logger.base.child({
      requestId: request.id,
      operation: 'payment_status_check'
    });

    try {
      const { paymentId } = request.params as PaymentStatusInput;
      
      statusLogger.info({ paymentId }, 'Checking payment status');
      
      const status = await mollieService.getPaymentStatus(paymentId);
      return { success: true, ...status };
    } catch (error) {
      statusLogger.error({ error: (error as Error).message }, 'Status check failed');
      
      if (error instanceof ApiError) {
        return reply.status(error.statusCode).send({ 
          error: error.message, 
          code: error.code 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Status check failed',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // Create refund - PRODUCTION SECURE
  fastify.post('/refund', {
    preHandler: [validationMiddleware(CreateRefundSchema)]
  }, async (request, reply) => {
    const refundLogger = logger.base.child({
      requestId: request.id,
      operation: 'create_refund'
    });

    try {
      const { paymentId, amount, description } = request.body as CreateRefundInput;
      
      refundLogger.info({ paymentId, amount }, 'Creating refund');
      
      const refundId = await mollieService.createRefund(paymentId, amount, description);
      
      refundLogger.info({ paymentId, refundId }, 'Refund created successfully');
      
      return { success: true, refundId };
    } catch (error) {
      refundLogger.error({ error: (error as Error).message }, 'Refund creation failed');
      
      if (error instanceof ApiError) {
        return reply.status(error.statusCode).send({ 
          error: error.message, 
          code: error.code 
        });
      }
      
      return reply.status(500).send({ 
        error: 'Refund creation failed',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}