import { FastifyRequest, FastifyReply } from "fastify";
import { createMenuItem, getMenuByRestaurantId } from "../services/menu.service";
import { CreateMenuItemSchema, GetMenuQuerySchema } from "../schemas/menu.schema";

export const createMenuItemHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateMenuItemSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  const item = await createMenuItem(result.data);
  return reply.code(201).send(item);
};

export const getMenuHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = GetMenuQuerySchema.safeParse(req.query);
  if (!result.success) {
    return reply.status(400).send({ error: "Missing or invalid restaurantId" });
  }

  const menu = await getMenuByRestaurantId(result.data.restaurantId);
  return reply.send(menu);
};
