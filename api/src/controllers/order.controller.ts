import { FastifyRequest, FastifyReply } from "fastify";
import { CreateOrderSchema } from "../schemas/order.schema";
import {
  createOrder,
  getOrderById,
  getOrdersByRestaurant,
  updateOrderStatus,
} from "../services/order.service";

export const createOrderHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    const result = CreateOrderSchema.safeParse(req.body);
    if (!result.success) {
      return reply.status(400).send({ error: "Invalid order", details: result.error });
    }

    const order = await createOrder(result.data);
    return reply.code(201).send(order);
  } catch (error) {
    console.error("Order creation error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return reply.status(500).send({ error: "Failed to create order", details: errorMessage });
  }
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

// NEW: Update order status handler
export const updateOrderStatusHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: string };

  if (!status) {
    return reply.status(400).send({ error: "Status is required" });
  }

  // Validate status values
  const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "COMPLETED", "CANCELLED"];
  if (!validStatuses.includes(status)) {
    return reply.status(400).send({ error: "Invalid status", validStatuses });
  }

  try {
    const updatedOrder = await updateOrderStatus(id, status);
    return reply.send(updatedOrder);
  } catch (error) {
    return reply.status(404).send({ error: "Order not found" });
  }
};