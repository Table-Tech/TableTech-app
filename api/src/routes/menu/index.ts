import { FastifyInstance } from "fastify";
import { createMenuItemHandler, getMenuHandler, getCustomerMenuHandler } from "../../controllers/menu.controller";
import { CreateMenuItemSchema, GetMenuQuerySchema } from "../../schemas/menu.schema";
import { validationMiddleware, validateQuery } from "../../middleware/validation.middleware";

export default async function menuRoutes(server: FastifyInstance) {
  // POST /api/menu - Create menu item
  server.post("/", {
    preHandler: [validationMiddleware(CreateMenuItemSchema)]
  }, createMenuItemHandler);
  
  // GET /api/menu?restaurantId=xxx - Get menu by restaurant (admin use)
  server.get("/", {
    preHandler: [validateQuery(GetMenuQuerySchema)]
  }, getMenuHandler);
  
  // GET /api/menu/:tableCode/:restaurantId - Get customer menu for QR scanning
  server.get("/:tableCode/:restaurantId", getCustomerMenuHandler);
}