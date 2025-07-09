import { FastifyInstance } from "fastify";
import {
  createCategoryHandler,
  getCategoriesHandler,
  getCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "../../controllers/category.controller";

export default async function categoryRoutes(server: FastifyInstance) {
  // GET /api/menu-categories?restaurantId=xxx
  server.get("/", getCategoriesHandler);
  
  // POST /api/menu-categories
  server.post("/", createCategoryHandler);
  
  // GET /api/menu-categories/:id
  server.get("/:id", getCategoryHandler);
  
  // PUT /api/menu-categories/:id
  server.put("/:id", updateCategoryHandler);
  
  // DELETE /api/menu-categories/:id (soft delete)
  server.delete("/:id", deleteCategoryHandler);
}