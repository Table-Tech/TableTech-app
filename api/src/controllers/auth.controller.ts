import { FastifyReply } from "fastify";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { AuthService } from "../services/auth.service.js";
import {
  LoginSchema,
  RegisterStaffSchema,
  ChangePasswordSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  RefreshTokenSchema
} from "../schemas/auth.schema.js";

export class AuthController {
  private svc = new AuthService();

  /** POST /auth/register */
  async register(
    req: AuthenticatedRequest<z.infer<typeof RegisterStaffSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.register(req.body);
    return reply.status(201).send({
      success: true,
      message: "Registration successful",
      data: result
    });
  }

  /** POST /auth/login */
  async login(
    req: AuthenticatedRequest<z.infer<typeof LoginSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.login(req.body);
    return reply.send({
      success: true,
      message: "Login successful",
      data: result
    });
  }

  /** POST /auth/refresh */
  async refresh(
    req: AuthenticatedRequest<z.infer<typeof RefreshTokenSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.refreshToken(req.body.refreshToken);
    return reply.send({
      success: true,
      data: result
    });
  }

  /** GET /auth/me */
  async getMe(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const user = await this.svc.getCurrentUser(req.user.staffId);
    return reply.send({
      success: true,
      data: user
    });
  }

  /** POST /auth/logout */
  async logout(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    // TODO: Implement token blacklisting if needed
    // For now, logout is handled client-side
    return reply.send({
      success: true,
      message: "Logout successful"
    });
  }

  /** PATCH /auth/password */
  async changePassword(
    req: AuthenticatedRequest<z.infer<typeof ChangePasswordSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.changePassword(req.user.staffId, req.body);
    return reply.send({
      success: true,
      message: "Password changed successfully"
    });
  }

  /** POST /auth/forgot-password */
  async forgotPassword(
    req: AuthenticatedRequest<z.infer<typeof ForgotPasswordSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.forgotPassword(req.body);
    return reply.send({
      success: true,
      message: "If the email exists, a password reset link has been sent"
    });
  }

  /** POST /auth/reset-password */
  async resetPassword(
    req: AuthenticatedRequest<z.infer<typeof ResetPasswordSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.resetPassword(req.body);
    return reply.send({
      success: true,
      message: "Password reset successful"
    });
  }
}
