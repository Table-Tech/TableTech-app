import { FastifyInstance } from "fastify";
import {
  createOrderHandler,
  getOrderHandler,
  listOrdersHandler,
  updateOrderStatusHandler,
} from "../../controllers/order.controller";

export default async function orderRoutes(server: FastifyInstance) {
  // POST /api/orders - Create new order
  server.post("/", createOrderHandler);
  
  // GET /api/orders?restaurantId=xxx - Get orders by restaurant
  server.get("/", listOrdersHandler);
  
  // GET /api/orders/:id - Get specific order
  server.get("/:id", getOrderHandler);
  
  // PATCH /api/orders/:id/status - Update order status
  server.patch("/:id/status", updateOrderStatusHandler);
}