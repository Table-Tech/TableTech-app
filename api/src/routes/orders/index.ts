import { FastifyInstance } from "fastify";
import { OrderController } from "../../controllers/order.controller.js";
import { OrderService } from "../../services/order.service.js";
import { 
  CreateOrderSchema,
  CreateCustomerOrderSchema,
  UpdateOrderStatusSchema,
  OrderQuerySchema,
  OrderParamsSchema,
  CustomerAuthSchema
} from "../../schemas/order.schema.js";
import { 
  validationMiddleware, 
  validateParams, 
  validateQuery,
  rateLimit
} from "../../middleware/validation.middleware.js";
import { requireUser, requireRole, requireRestaurantAccess } from "../../middleware/auth.middleware.js";
import { ApiError } from "../../types/errors.js";
import { z } from 'zod';

export default async function orderRoutes(server: FastifyInstance) {
  const controller = new OrderController();
  const orderService = new OrderService();

  // =================== STAFF ROUTES ===================
  server.register(async function staffOrderRoutes(server) {
    // All routes here require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/orders - Create staff order
    server.post("/orders", {
      preHandler: [validationMiddleware(CreateOrderSchema)]
    }, (req, reply) => controller.createStaffOrder(req as any, reply));

    // GET /api/staff/orders - List orders
    server.get("/orders", {
      preHandler: [validateQuery(OrderQuerySchema)]
    }, (req, reply) => controller.listOrders(req as any, reply));

    // GET /api/staff/kitchen - Kitchen display
    server.get("/kitchen", {
      preHandler: [requireRole(['CHEF', 'MANAGER', 'ADMIN', 'SUPER_ADMIN'])]
    }, (req, reply) => controller.getKitchenOrders(req as any, reply));

    // GET /api/staff/statistics - Statistics
    server.get("/statistics", {
      preHandler: [requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])]
    }, (req, reply) => controller.getOrderStatistics(req as any, reply));

    // GET /api/staff/:id - Get order details
    server.get("/:id", {
      preHandler: [validateParams(OrderParamsSchema)]
    }, (req, reply) => controller.getOrderById(req as any, reply));

    // PATCH /api/staff/:id/status - Update status
    server.patch("/:id/status", {
      preHandler: [
        validateParams(OrderParamsSchema),
        validationMiddleware(UpdateOrderStatusSchema)
      ]
    }, (req, reply) => controller.updateOrderStatus(req as any, reply));

    // DELETE /api/staff/:id - Cancel order
    server.delete("/:id", {
      preHandler: [
        validateParams(OrderParamsSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.cancelOrder(req as any, reply));


  }, { prefix: '/staff' });

  // =================== CUSTOMER ROUTES ===================
  server.register(async function customerOrderRoutes(server) {
    // Apply rate limiting to all customer routes
    server.addHook('preHandler', rateLimit(20, 60000)); // 20 requests per minute

    // POST /api/customer/validate-table - Validate table
    server.post("/validate-table", {
      preHandler: [validationMiddleware(CustomerAuthSchema)]
    }, (req, reply) => controller.validateTableCode(req as any, reply));

    // POST /api/customer/orders - Create customer order
    server.post("/orders", {
      preHandler: [
        validationMiddleware(CreateCustomerOrderSchema),
        rateLimit(5, 300000) // 5 orders per 5 minutes per IP
      ]
    }, (req, reply) => controller.createCustomerOrder(req as any, reply));

    // GET /api/customer/orders/:orderNumber - Track order
    server.get("/orders/:orderNumber", 
      (req, reply) => controller.trackCustomerOrder(req as any, reply)
    );

    // GET /api/customer/orders/table/:tableCode - Get table orders
    server.get("/orders/table/:tableCode",
      (req, reply) => controller.getTableOrders(req as any, reply)
    );

    // GET /api/customer/orders/id/:orderId - Get order details for thank you page
    server.get("/orders/id/:orderId", {
      preHandler: [validateParams(z.object({ orderId: z.string().uuid() }))]
    }, async (request, reply) => {
      const { orderId } = request.params as { orderId: string };
      
      try {
        const order = await (orderService as any).prisma.order.findUnique({
          where: { id: orderId },
          include: {
            table: {
              select: { id: true, number: true, code: true }
            }
          }
        });
        
        if (!order) {
          throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
        }
        
        // Return minimal order info for customers
        return reply.send({
          success: true,
          data: {
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            totalAmount: order.totalAmount,
            createdAt: order.createdAt,
            table: order.table ? {
              number: order.table.number
            } : null
          }
        });
      } catch (error) {
        if (error instanceof ApiError) {
          return reply.status(error.statusCode).send({ 
            error: error.message, 
            code: error.code 
          });
        }
        
        return reply.status(500).send({ 
          error: 'Failed to fetch order',
          code: 'INTERNAL_ERROR' 
        });
      }
    });
  }, { prefix: '/customer' });
}