// src/routes/orders/index.ts
import { FastifyInstance } from "fastify";
import {
  createOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
  getOrderStatisticsHandler,
  getActiveOrdersHandler
} from "../../controllers/order.controller.js";
import { 
  CreateOrderSchema, 
  UpdateOrderStatusSchema,
  GetOrdersQuerySchema,
  OrderIdParamSchema,
  OrderStatisticsQuerySchema,
  RestaurantIdParamSchema
} from "../../schemas/order.schema.js";
import { validateRequest, limitRequestSize } from "../../middleware/validation.middleware.js";
import { authenticateStaff, requireRestaurantAccess, requireRole } from "../../middleware/auth.middleware.js";
import { OrderSecurity } from "../../middleware/order.security.js";

export default async function orderRoutes(server: FastifyInstance) {
  
  // POST /api/orders - Create new order (public endpoint for customers)
  server.post("/", {
    preHandler: [
      limitRequestSize(1024 * 100), // 100KB limit for order creation
      OrderSecurity.rateLimitOrderCreation(10, 60000), // 10 orders per minute per IP
      OrderSecurity.preventDuplicateOrders(30000), // Prevent duplicate orders within 30s
      OrderSecurity.validateOrderSession(),
      OrderSecurity.validateBusinessHours,
      validateRequest({
        body: CreateOrderSchema
      }),
      OrderSecurity.sanitizeOrderData,
      OrderSecurity.logOrderAttempt
    ]
  }, createOrderHandler);
  
  // GET /api/orders?restaurantId=xxx - Get orders by restaurant (protected)
  server.get("/", {
    preHandler: [
      authenticateStaff,
      requireRestaurantAccess,
      validateRequest({
        query: GetOrdersQuerySchema
      })
    ]
  }, listOrdersHandler);
  
  // GET /api/orders/active - Get active orders count (protected)
  server.get("/active", {
    preHandler: [
      authenticateStaff,
      requireRole(['CHEF', 'MANAGER', 'ADMIN', 'WAITER'])
    ]
  }, getActiveOrdersHandler);
  
  // GET /api/orders/statistics/:restaurantId - Get order statistics (protected)
  server.get("/statistics/:restaurantId", {
    preHandler: [
      authenticateStaff,
      requireRole(['MANAGER', 'ADMIN']),
      requireRestaurantAccess,
      validateRequest({
        params: RestaurantIdParamSchema,
        query: OrderStatisticsQuerySchema
      })
    ]
  }, getOrderStatisticsHandler);
  
  // GET /api/orders/:id - Get specific order (protected) 
  server.get("/:id", {
    preHandler: [
      authenticateStaff,
      requireRestaurantAccess,
      validateRequest({
        params: OrderIdParamSchema
      })
    ]
  }, getOrderHandler);
  
  // PATCH /api/orders/:id/status - Update order status (protected)
  server.patch("/:id/status", {
    preHandler: [
      authenticateStaff,
      requireRestaurantAccess,
      validateRequest({
        params: OrderIdParamSchema,
        body: UpdateOrderStatusSchema
      })
    ]
  }, updateOrderStatusHandler);
}