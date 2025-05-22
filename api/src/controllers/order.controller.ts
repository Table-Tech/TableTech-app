import { FastifyRequest, FastifyReply } from "fastify";
import { CreateOrderSchema } from "../schemas/order.schema";
import {
  createOrder,
  getOrderById,
  getOrdersByRestaurant,
} from "../services/order.service";

export const createOrderHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateOrderSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid order", details: result.error });
  }

  const order = await createOrder(result.data);
  return reply.code(201).send(order);
};

export const getOrderHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const order = await getOrderById(id);
  if (!order) return reply.status(404).send({ error: "Order not found" });
  return reply.send(order);
};

export const listOrdersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { restaurantId } = req.query as { restaurantId: string };
  if (!restaurantId) return reply.status(400).send({ error: "Missing restaurantId" });

  const orders = await getOrdersByRestaurant(restaurantId);
  return reply.send(orders);
};
