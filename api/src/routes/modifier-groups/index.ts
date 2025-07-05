import { FastifyInstance } from "fastify";
import {
  createModifierGroupHandler,
  getModifierGroupsHandler,
  getModifierGroupHandler,
  updateModifierGroupHandler,
  deleteModifierGroupHandler,
} from "../../controllers/modifier-group.controller";

export default async function modifierGroupRoutes(server: FastifyInstance) {
  // GET /api/modifier-groups?menuItemId=xxx
  server.get("/", getModifierGroupsHandler);
  
  // POST /api/modifier-groups
  server.post("/", createModifierGroupHandler);
  
  // GET /api/modifier-groups/:id
  server.get("/:id", getModifierGroupHandler);
  
  // PUT /api/modifier-groups/:id
  server.put("/:id", updateModifierGroupHandler);
  
  // DELETE /api/modifier-groups/:id
  server.delete("/:id", deleteModifierGroupHandler);
}