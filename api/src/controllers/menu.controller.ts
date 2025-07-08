import { FastifyRequest, FastifyReply } from "fastify";
import { createMenuItem, getMenuByRestaurantId, getCustomerMenu } from "../services/menu.service";
import { CreateMenuItemSchema, GetMenuQuerySchema } from "../schemas/menu.schema";
import { z } from "zod";

type CreateMenuItemRequest = FastifyRequest<{ Body: z.infer<typeof CreateMenuItemSchema> }>;
type GetMenuRequest = FastifyRequest<{ Querystring: z.infer<typeof GetMenuQuerySchema> }>;

export const createMenuItemHandler = async (req: CreateMenuItemRequest, reply: FastifyReply) => {
  // req.body is now validated by middleware
  const item = await createMenuItem(req.body);
  return reply.status(201).send({ success: true, data: item });
};

export const getMenuHandler = async (req: GetMenuRequest, reply: FastifyReply) => {
  // req.query is now validated by middleware
  const menu = await getMenuByRestaurantId(req.query.restaurantId);
  return reply.send({ success: true, data: menu });
};

// NEW: Get customer menu for QR code scanning
export const getCustomerMenuHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { tableCode, restaurantId } = req.params as { tableCode: string; restaurantId: string };

  const customerMenu = await getCustomerMenu(tableCode, restaurantId);
  return reply.send({ success: true, data: customerMenu });
};