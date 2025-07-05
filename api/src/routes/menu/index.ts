import { FastifyInstance } from "fastify";
import { createMenuItemHandler, getMenuHandler, getCustomerMenuHandler } from "../../controllers/menu.controller";

export default async function menuRoutes(server: FastifyInstance) {
  // POST /api/menu - Create menu item
  server.post("/", createMenuItemHandler);
  
  // GET /api/menu?restaurantId=xxx - Get menu by restaurant (admin use)
  server.get("/", getMenuHandler);
  
  // GET /api/menu/:tableCode/:restaurantId - Get customer menu for QR scanning
  server.get("/:tableCode/:restaurantId", getCustomerMenuHandler);
}