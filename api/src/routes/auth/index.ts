import { FastifyInstance } from "fastify";
import { loginHandler, getMeHandler, logoutHandler } from "../../controllers/auth.controller";
import { requireUser } from "../../middleware/auth.middleware";
import { validationMiddleware } from "../../middleware/validation.middleware";
import { LoginSchema } from "../../schemas/auth.schema.js";

export default async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/login - Login
  server.post("/login", {
    preHandler: [
      validationMiddleware(LoginSchema)
    ]
  }, loginHandler);
  
  // POST /api/auth/logout - Logout
  server.post("/logout", logoutHandler);
  
  // GET /api/auth/me - Get current user info (requires authentication)
  server.get("/me", {
    preHandler: [requireUser]
  }, getMeHandler);
}