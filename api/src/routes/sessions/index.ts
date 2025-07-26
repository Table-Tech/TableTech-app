import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CustomerSessionService } from '../../services/infrastructure/session/customer-session.service.js';
import { z } from 'zod';

// Request schemas
const CreateSessionSchema = z.object({
  tableCode: z.string().min(1),
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional()
});

const SessionTokenSchema = z.object({
  sessionToken: z.string().min(1)
});

export default async function sessionRoutes(fastify: FastifyInstance) {
  const sessionService = new CustomerSessionService(fastify.prisma);

  /**
   * Create new customer session (QR code scan)
   * POST /api/sessions/create
   */
  fastify.post('/create', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = CreateSessionSchema.parse(request.body);
      
      const session = await sessionService.createSession({
        tableCode: body.tableCode,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      return {
        success: true,
        session: {
          sessionToken: session.sessionToken,
          tableInfo: {
            number: session.tableNumber,
            restaurantName: session.restaurantName
          },
          expiresAt: session.expiresAt,
          customerName: session.customerName
        }
      };

    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to create session'
      });
    }
  });

  /**
   * Validate session and get info
   * GET /api/sessions/validate/:sessionToken
   */
  fastify.get('/validate/:sessionToken', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionToken } = request.params as { sessionToken: string };
      
      const session = await sessionService.validateSession(sessionToken);

      return {
        success: true,
        session: {
          tableInfo: {
            number: session.tableNumber,
            restaurantName: session.restaurantName
          },
          customerName: session.customerName,
          expiresAt: session.expiresAt,
          createdAt: session.createdAt
        }
      };

    } catch (error: any) {
      return reply.status(error.statusCode || 401).send({
        success: false,
        error: error.message || 'Invalid session'
      });
    }
  });

  /**
   * Get orders for current session
   * GET /api/sessions/:sessionToken/orders
   */
  fastify.get('/:sessionToken/orders', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionToken } = request.params as { sessionToken: string };
      
      const orders = await sessionService.getSessionOrders(sessionToken);

      return {
        success: true,
        orders
      };

    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to get orders'
      });
    }
  });

  /**
   * Extend session expiration
   * POST /api/sessions/:sessionToken/extend
   */
  fastify.post('/:sessionToken/extend', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionToken } = request.params as { sessionToken: string };
      
      const newExpiresAt = await sessionService.extendSession(sessionToken);

      return {
        success: true,
        expiresAt: newExpiresAt
      };

    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to extend session'
      });
    }
  });

  /**
   * End session manually
   * POST /api/sessions/:sessionToken/end
   */
  fastify.post('/:sessionToken/end', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { sessionToken } = request.params as { sessionToken: string };
      
      await sessionService.expireSession(sessionToken);

      return {
        success: true,
        message: 'Session ended successfully'
      };

    } catch (error: any) {
      return reply.status(error.statusCode || 500).send({
        success: false,
        error: error.message || 'Failed to end session'
      });
    }
  });

  /**
   * Health check for session system
   * GET /api/sessions/health
   */
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Clean up expired sessions as part of health check
      const cleanedUp = await sessionService.cleanupExpiredSessions();

      return {
        success: true,
        status: 'healthy',
        cleanedUpSessions: cleanedUp,
        timestamp: new Date()
      };

    } catch (error: any) {
      return reply.status(500).send({
        success: false,
        status: 'unhealthy',
        error: error.message
      });
    }
  });
}