// src/routes/orders/index.ts
import { FastifyInstance } from "fastify";
import {
  createOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
} from "../../controllers/order.controller.js";
import { 
  EnhancedCreateOrderSchema, 
  EnhancedUpdateOrderStatusSchema,
  GetOrdersQuerySchema,
  OrderIdParamSchema 
} from "../../schemas/enhanced-order.schema.js";
import { validateRequest } from "../../middleware/validation.middleware.js";
import { authenticateStaff, requireRestaurantAccess } from "../../middleware/auth.middleware.js";

export default async function orderRoutes(server: FastifyInstance) {
  
  // POST /api/orders - Create new order (public endpoint for customers)
  server.post("/", {
    preHandler: [
      validateRequest({
        body: EnhancedCreateOrderSchema
      })
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
        body: EnhancedUpdateOrderStatusSchema
      })
    ]
  }, updateOrderStatusHandler);
}