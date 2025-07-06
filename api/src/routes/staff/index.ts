import { FastifyInstance } from "fastify";
import {
  createStaffHandler,
  getStaffHandler,
  getStaffByIdHandler,
  updateStaffHandler,
  deleteStaffHandler,
} from "../../controllers/staff.controller";
import { requireStaff, requireRole, requireRestaurantAccess } from "../../middleware/auth.middleware"; // Fixed import

export default async function staffRoutes(server: FastifyInstance) {
  // All staff routes require authentication
  server.addHook('preHandler', requireStaff); // Changed from authenticateStaff
  
  // GET /api/staff - Get staff by restaurant (any authenticated staff)
  server.get("/", {
    preHandler: [requireRestaurantAccess]
  }, getStaffHandler);
  
  // POST /api/staff - Create staff member (admin/manager only)
  server.post("/", {
    preHandler: [requireRole(["ADMIN", "MANAGER"])]
  }, createStaffHandler);
  
  // GET /api/staff/:id - Get specific staff member
  server.get("/:id", {
    preHandler: [requireRestaurantAccess]
  }, getStaffByIdHandler);
  
  // PUT /api/staff/:id - Update staff member (admin/manager only)
  server.put("/:id", {
    preHandler: [requireRole(["ADMIN", "MANAGER"])]
  }, updateStaffHandler);
  
  // DELETE /api/staff/:id - Delete staff member (admin only)
  server.delete("/:id", {
    preHandler: [requireRole(["ADMIN"])]
  }, deleteStaffHandler);
}