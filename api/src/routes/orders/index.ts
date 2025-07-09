// src/routes/orders/index.ts
import { FastifyInstance } from "fastify";
import { OrderController } from "../../controllers/order.controller.js";
import { 
  CreateOrderSchema, 
  OrderParamsSchema
} from "../../schemas/order.schema.js";
import { validationMiddleware } from "../../middleware/validation.middleware.js";
import { requireUser } from "../../middleware/auth.middleware.js";
import { preventDuplicateOrders } from "../../middleware/order.security.js";

export default async function orderRoutes(server: FastifyInstance) {
  const controller = new OrderController();
  
  // POST /api/orders - Create new order (protected)
  server.post("/", {
    preHandler: [
      // requireUser, // TEMPORARILY COMMENTED OUT FOR TESTING
      // preventDuplicateOrders(30000), // TEMPORARILY COMMENTED OUT FOR TESTING
      validationMiddleware(CreateOrderSchema)
    ]
  }, async (request, reply) => {
    return controller.create(request as any, reply);
  });
  
  // GET /api/orders - List orders (protected)
  server.get("/", {
    preHandler: [requireUser]
  }, async (request, reply) => {
    return controller.list(request as any, reply);
  });

  // GET /api/orders/statistics - Get order statistics (protected)
  server.get("/statistics", {
    preHandler: [requireUser]
  }, async (request, reply) => {
    return controller.getStatistics(request as any, reply);
  });

  // GET /api/orders/active-count - Get active orders count (protected)
  server.get("/active-count", {
    preHandler: [requireUser]
  }, async (request, reply) => {
    return controller.getActiveCount(request as any, reply);
  });
  
  // GET /api/orders/:id - Get specific order (protected) 
  server.get("/:id", {
    preHandler: [
      requireUser,
      validationMiddleware(OrderParamsSchema)
    ]
  }, async (request, reply) => {
    return controller.findById(request as any, reply);
  });
  
  // PATCH /api/orders/:id/status - Update order status (protected)
  server.patch("/:id/status", {
    preHandler: [
      requireUser,
      validationMiddleware(OrderParamsSchema)
    ]
  }, async (request, reply) => {
    return controller.updateStatus(request as any, reply);
  });
  
  // DELETE /api/orders/:id - Delete order (protected)
  server.delete("/:id", {
    preHandler: [
      requireUser,
      validationMiddleware(OrderParamsSchema)
    ]
  }, async (request, reply) => {
    return controller.delete(request as any, reply);
  });
}