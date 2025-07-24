import { FastifyInstance } from "fastify";
import { OrderController } from "../../controllers/order.controller.js";
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
import { requireUser, requireRole } from "../../middleware/auth.middleware.js";

export default async function orderRoutes(server: FastifyInstance) {
  const controller = new OrderController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffOrderRoutes(server) {
    // All routes here require authentication
    server.addHook('preHandler', requireUser);

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
      preHandler: [requireRole(['CHEF', 'MANAGER', 'ADMIN'])]
    }, (req, reply) => controller.getKitchenOrders(req as any, reply));

    // GET /api/staff/statistics - Statistics
    server.get("/statistics", {
      preHandler: [requireRole(['MANAGER', 'ADMIN'])]
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
        requireRole(['MANAGER', 'ADMIN'])
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
  }, { prefix: '/customer' });
}