import { FastifyInstance } from "fastify";
import { AuthController } from "../../controllers/auth.controller.js";
import { requireUser, requireManager } from "../../middleware/auth.middleware.js";
import { validationMiddleware } from "../../middleware/validation.middleware.js";
import { rateLimit } from "../../middleware/validation.middleware.js";
import {
  LoginSchema,
  RegisterStaffSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RefreshTokenSchema
} from "../../schemas/auth.schema.js";

export default async function authRoutes(server: FastifyInstance) {
  const controller = new AuthController();

  // Public routes with rate limiting
  
  // POST /auth/register - Register new staff (managers only)
  server.post("/register", {
    preHandler: [
      requireUser,
      requireManager, // Only managers/admins can create staff
      validationMiddleware(RegisterStaffSchema)
    ]
  }, (req, reply) => controller.register(req as any, reply));

  // POST /auth/login - Login
  server.post("/login", {
    preHandler: [
      rateLimit(5, 900000), // 5 attempts per 15 minutes
      validationMiddleware(LoginSchema)
    ]
  }, (req, reply) => controller.login(req as any, reply));

  // POST /auth/refresh - Refresh token
  server.post("/refresh", {
    preHandler: [
      rateLimit(10, 3600000), // 10 attempts per hour
      validationMiddleware(RefreshTokenSchema)
    ]
  }, (req, reply) => controller.refresh(req as any, reply));

  // POST /auth/forgot-password - Request password reset
  server.post("/forgot-password", {
    preHandler: [
      rateLimit(3, 3600000), // 3 attempts per hour
      validationMiddleware(ForgotPasswordSchema)
    ]
  }, (req, reply) => controller.forgotPassword(req as any, reply));

  // POST /auth/reset-password - Reset password with token
  server.post("/reset-password", {
    preHandler: [
      rateLimit(5, 3600000), // 5 attempts per hour
      validationMiddleware(ResetPasswordSchema)
    ]
  }, (req, reply) => controller.resetPassword(req as any, reply));

  // Protected routes
  
  // GET /auth/me - Get current user
  server.get("/me", {
    preHandler: [requireUser]
  }, (req, reply) => controller.getMe(req as any, reply));

  // POST /auth/logout - Logout
  server.post("/logout", {
    preHandler: [requireUser]
  }, (req, reply) => controller.logout(req as any, reply));

  // PATCH /auth/password - Change password
  server.patch("/password", {
    preHandler: [
      requireUser,
      validationMiddleware(ChangePasswordSchema)
    ]
  }, (req, reply) => controller.changePassword(req as any, reply));
}