import { FastifyInstance } from "fastify";
import {
  createOrderHandler,
  getOrderHandler,
  listOrdersHandler,
} from "../../controllers/order.controller";

export default async function orderRoutes(server: FastifyInstance) {
  server.post("/", createOrderHandler);
  server.get("/", listOrdersHandler);
  server.get("/:id", getOrderHandler);
}
