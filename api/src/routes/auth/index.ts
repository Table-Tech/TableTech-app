import { FastifyInstance } from "fastify";
import { loginHandler, getMeHandler, logoutHandler } from "../../controllers/auth.controller";
import { authenticateStaff } from "../../middleware/auth.middleware";

export default async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/login - Staff login
  server.post("/login", loginHandler);
  
  // POST /api/auth/logout - Staff logout
  server.post("/logout", logoutHandler);
  
  // GET /api/auth/me - Get current staff info (requires authentication)
  server.get("/me", {
    preHandler: [authenticateStaff]
  }, getMeHandler);
}