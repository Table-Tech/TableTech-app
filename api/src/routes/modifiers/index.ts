import { FastifyInstance } from "fastify";
import {
  createModifierHandler,
  getModifiersHandler,
  getModifierHandler,
  updateModifierHandler,
  deleteModifierHandler,
} from "../../controllers/modifier.controller";

export default async function modifierRoutes(server: FastifyInstance) {
  // GET /api/modifiers?modifierGroupId=xxx
  server.get("/", getModifiersHandler);
  
  // POST /api/modifiers
  server.post("/", createModifierHandler);
  
  // GET /api/modifiers/:id
  server.get("/:id", getModifierHandler);
  
  // PUT /api/modifiers/:id
  server.put("/:id", updateModifierHandler);
  
  // DELETE /api/modifiers/:id
  server.delete("/:id", deleteModifierHandler);
}