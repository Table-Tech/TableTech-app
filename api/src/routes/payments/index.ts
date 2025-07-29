import { FastifyInstance } from 'fastify';
import { createMollieService } from '../../services/infrastructure/payment/mollie.service.js';

export default async function paymentRoutes(fastify: FastifyInstance) {
  const mollieService = createMollieService(fastify.prisma);

  // Create payment for an order
  fastify.post('/create', async (request, reply) => {
    const { orderId, amount, description } = request.body as any;
    
    try {
      const payment = await mollieService.createPayment({
        orderId,
        amount,
        restaurantId: 'temp', // Get from order
        description
      });
      
      return { success: true, ...payment };
    } catch (error) {
      return reply.status(500).send({ error: 'Payment creation failed' });
    }
  });

  // Webhook endpoint - Mollie calls this
  fastify.post('/webhook', async (request, reply) => {
    const { id: paymentId } = request.body as any;
    
    try {
      await mollieService.processWebhook(paymentId);
      return reply.status(200).send('OK');
    } catch (error) {
      return reply.status(500).send('Webhook processing failed');
    }
  });

  // Check payment status
  fastify.get('/status/:paymentId', async (request, reply) => {
    const { paymentId } = request.params as any;
    
    try {
      const status = await mollieService.getPaymentStatus(paymentId);
      return { success: true, ...status };
    } catch (error) {
      return reply.status(500).send({ error: 'Status check failed' });
    }
  });

  // Create refund
  fastify.post('/refund', async (request, reply) => {
    const { paymentId, amount, description } = request.body as any;
    
    try {
      const refundId = await mollieService.createRefund(paymentId, amount, description);
      return { success: true, refundId };
    } catch (error) {
      return reply.status(500).send({ error: 'Refund failed' });
    }
  });
}