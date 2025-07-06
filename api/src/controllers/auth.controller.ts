import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { ApiError } from "../types/errors.js";
import { AuthService } from "../services/auth.service.js";
import { LoginSchema } from "../schemas/auth.schema.js";

export class AuthController {
  private svc = new AuthService();

  /** POST /auth/login */
  async login(
    req: AuthenticatedRequest<typeof LoginSchema._type>,
    reply: FastifyReply
  ) {
    const authResult = await this.svc.login(req.body);
    return reply.send({
      success: true,
      message: "Login successful",
      data: authResult
    });
  }

  /** GET /auth/me */
  async getMe(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const staff = await this.svc.getStaffFromToken(req.user.staffId);
    if (!staff) {
      throw new ApiError(404, 'NOT_FOUND', 'Staff member not found');
    }
    return reply.send({ success: true, data: staff });
  }

  /** POST /auth/logout */
  async logout(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    // JWT is stateless, logout is handled client-side by removing token
    // Future: Add token blacklisting here if needed
    return reply.send({ success: true, message: "Logout successful" });
  }
}

// Export handler functions for routes
const authController = new AuthController();

export const loginHandler = (req: any, reply: FastifyReply) => authController.login(req, reply);
export const getMeHandler = (req: any, reply: FastifyReply) => authController.getMe(req, reply);
export const logoutHandler = (req: any, reply: FastifyReply) => authController.logout(req, reply);