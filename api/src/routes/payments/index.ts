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
import { verifyMollieWebhookSignature } from '../../utils/webhook-security.js';
import { RedisRateLimiter } from '../../utils/redis-rate-limiter.js';
import { logger } from '../../utils/logger.js';
import { ApiError } from '../../types/errors.js';
import { validationMiddleware, validateParams } from '../../middleware/validation.middleware.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  const mollieService = createMollieService(fastify.prisma);
  const rateLimiter = RedisRateLimiter.getInstance();

  // Create payment for an order - PRODUCTION SECURE with Redis rate limiting
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