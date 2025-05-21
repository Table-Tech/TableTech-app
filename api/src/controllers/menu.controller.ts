import { FastifyRequest, FastifyReply } from "fastify";
import { getMenuByRestaurantId, createMenuItem  } from "../services/menu.service";
import { GetMenuQuerySchema, CreateMenuItemSchema  } from "../schemas/menu.schema";

export const getMenuHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = GetMenuQuerySchema.safeParse(req.query);

  if (!result.success) {
    return reply.status(400).send({ error: "Invalid restaurantId" });
  }

  const { restaurantId } = result.data;

  const menu = await getMenuByRestaurantId(restaurantId);

  return reply.send(menu);
};

export const createMenuItemHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const parsed = CreateMenuItemSchema.safeParse(req.body);

  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid input", details: parsed.error });
  }

  const menuItem = await createMenuItem(parsed.data);

  return reply.code(201).send(menuItem);
};