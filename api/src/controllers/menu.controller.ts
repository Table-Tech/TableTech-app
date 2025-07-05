import { FastifyRequest, FastifyReply } from "fastify";
import { createMenuItem, getMenuByRestaurantId, getCustomerMenu } from "../services/menu.service";
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

// NEW: Get customer menu for QR code scanning
export const getCustomerMenuHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { tableCode, restaurantId } = req.params as { tableCode: string; restaurantId: string };

  try {
    const customerMenu = await getCustomerMenu(tableCode, restaurantId);
    return reply.send(customerMenu);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return reply.status(404).send({ error: errorMessage });
  }
};