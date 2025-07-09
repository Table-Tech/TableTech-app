import { FastifyInstance } from "fastify";
import { loginHandler, getMeHandler, logoutHandler } from "../../controllers/auth.controller";
import { requireUser } from "../../middleware/auth.middleware"; // Changed from authenticateStaff
import { CreateStaffSchema } from "../../schemas/auth.schema";
import { StaffService } from "../../services/staff.service"; // Use the class instead

export default async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/login - Staff login
  server.post("/login", loginHandler);
  
  // POST /api/auth/logout - Staff logout
  server.post("/logout", logoutHandler);
  
  // GET /api/auth/me - Get current staff info (requires authentication)
  server.get("/me", {
    preHandler: [requireUser] // Changed from authenticateStaff
  }, getMeHandler);

}