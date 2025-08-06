import { Staff, Prisma } from "@prisma/client";
import { BaseService } from "./base.service.js";
import { comparePassword, hashPassword, generateResetToken } from "../utils/password.js";
import { generateToken, generateRefreshToken, verifyRefreshToken, JWTPayload } from "../utils/jwt.js";
import { ApiError } from "../types/errors.js";
import { 
  LoginDTO, 
  RegisterStaffDTO, 
  ChangePasswordDTO,
  ForgotPasswordDTO,
  ResetPasswordDTO 
} from "../schemas/auth.schema.js";
import { staffSessionService } from "./infrastructure/session/staff-session.service.js";

type UserWithSession = {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurantId: string | null;
  sessionId?: string;
  restaurant?: {
    id: string;
    name: string;
  };
};

type LoginResponse = {
  token: string;
  refreshToken: string;
  staff: UserWithSession; // Backwards compatibility
  user: UserWithSession;  // New standard format
};

export class AuthService extends BaseService<Prisma.StaffCreateInput, Staff> {
  protected model = 'staff' as const;

  /**
   * Register new staff member
   */
  async register(data: RegisterStaffDTO): Promise<LoginResponse> {
    // Check if email already exists
    const existing = await this.prisma.staff.findUnique({
      where: { email: data.email }
    });

    if (existing) {
      throw new ApiError(409, 'EMAIL_EXISTS', 'Email already registered');
    }

    // Create staff member
    const passwordHash = await hashPassword(data.password);
    
    const staff = await this.prisma.staff.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        restaurant: { connect: { id: data.restaurantId } }
      },
      include: {
        restaurant: { select: { id: true, name: true } }
      }
    });

    // Generate tokens
    const tokenPayload: JWTPayload = {
      staffId: staff.id,
      restaurantId: staff.restaurantId,
      role: staff.role,
      email: staff.email
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Create user object (no session for register - sessions created on login only)
    const userData: UserWithSession = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      restaurantId: staff.restaurantId,
      restaurant: staff.restaurant || undefined
    };

    return {
      token,
      refreshToken,
      // Keep staff for backwards compatibility
      staff: userData,
      // Add user for new standard format
      user: userData
    };
  }

  /**
   * Login staff member
   */
  async login(data: LoginDTO, userAgent?: string): Promise<LoginResponse> {
    // Find staff by email
    const staff = await this.prisma.staff.findUnique({
      where: { email: data.email },
      include: {
        restaurant: { select: { id: true, name: true } }
      }
    });

    if (!staff) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    if (!staff.isActive) {
      throw new ApiError(401, 'ACCOUNT_DEACTIVATED', 'Account has been deactivated');
    }

    // Check account lockout
    if (staff.lockedUntil && staff.lockedUntil > new Date()) {
      throw new ApiError(401, 'ACCOUNT_LOCKED', 'Account is temporarily locked due to failed login attempts');
    }

    // Verify password
    const isValid = await comparePassword(data.password, staff.passwordHash);
    if (!isValid) {
      // Increment failed attempts
      await this.prisma.staff.update({
        where: { id: staff.id },
        data: { 
          loginAttempts: { increment: 1 },
          // Lock account after 5 failed attempts for 30 minutes
          lockedUntil: staff.loginAttempts >= 4 ? new Date(Date.now() + 30 * 60 * 1000) : null
        }
      });
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Create session with fallback handling
    let session;
    try {
      session = await staffSessionService.createSession({
        staffId: staff.id,
        userAgent: userAgent,
        refreshToken: generateRefreshToken({ 
          staffId: staff.id, 
          restaurantId: staff.restaurantId, 
          role: staff.role, 
          email: staff.email 
        })
      });
    } catch (sessionError) {
      // If session creation fails, continue with JWT-only auth
      console.error('Session creation failed during login:', sessionError);
      
      // Generate JWT without session ID (fallback mode)
      const tokenPayload: JWTPayload = {
        staffId: staff.id,
        restaurantId: staff.restaurantId,
        role: staff.role,
        email: staff.email
      };

      const token = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      const userData: UserWithSession = {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurantId: staff.restaurantId,
        restaurant: staff.restaurant || undefined
      };

      return {
        token,
        refreshToken,
        staff: userData,
        user: userData
      };
    }

    // Generate tokens with session ID
    const tokenPayload: JWTPayload = {
      staffId: staff.id,
      sessionId: session.sessionId,
      restaurantId: staff.restaurantId,
      role: staff.role,
      email: staff.email
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Create user object with session info
    const userWithSession = {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      restaurantId: staff.restaurantId,
      sessionId: session.sessionId,
      restaurant: staff.restaurant || undefined
    };

    return {
      token,
      refreshToken,
      // Keep staff for backwards compatibility
      staff: userWithSession,
      // Add user for new standard format
      user: userWithSession
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      
      // Verify staff still exists and is active
      const staff = await this.prisma.staff.findUnique({
        where: { id: payload.staffId },
        select: { id: true, isActive: true, role: true, email: true, restaurantId: true }
      });

      if (!staff || !staff.isActive) {
        throw new ApiError(401, 'INVALID_TOKEN', 'Invalid refresh token');
      }

      // Validate session if present
      if (payload.sessionId) {
        try {
          const sessionValidation = await staffSessionService.validateSession(payload.sessionId);
          
          if (!sessionValidation.valid) {
            throw new ApiError(401, 'SESSION_INVALID', sessionValidation.reason || 'Session is not valid');
          }

          // Validate refresh token matches session
          const isValidRefreshToken = await staffSessionService.validateRefreshToken(payload.sessionId, refreshToken);
          if (!isValidRefreshToken) {
            throw new ApiError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token does not match session');
          }

          // Extend session
          await staffSessionService.extendSession(payload.sessionId);
          
        } catch (sessionError) {
          if (sessionError instanceof ApiError) {
            throw sessionError; // Re-throw session validation errors
          }
          
          // Handle session service infrastructure errors
          console.error('Session service error during refresh:', sessionError);
          throw new ApiError(503, 'SESSION_SERVICE_UNAVAILABLE', 'Session service temporarily unavailable');
        }
      }

      // Generate new tokens
      const newPayload: JWTPayload = {
        staffId: staff.id,
        sessionId: payload.sessionId, // Keep same session ID
        restaurantId: staff.restaurantId,
        role: staff.role,
        email: staff.email
      };

      return {
        token: generateToken(newPayload),
        refreshToken: generateRefreshToken(newPayload)
      };

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
    }
  }

  /**
   * Logout - revoke session
   */
  async logout(sessionId: string, staffId: string): Promise<void> {
    try {
      await staffSessionService.revokeSession(sessionId, 'logout', staffId);
    } catch (sessionError) {
      // Log error but don't fail logout if session service is unavailable
      console.error('Session service error during logout:', sessionError);
      // Still allow logout to succeed - JWT will expire naturally
    }
  }

  /**
   * Change password
   */
  async changePassword(staffId: string, data: ChangePasswordDTO): Promise<void> {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { passwordHash: true }
    });

    if (!staff) {
      throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    }

    // Verify current password
    const isValid = await comparePassword(data.currentPassword, staff.passwordHash);
    if (!isValid) {
      throw new ApiError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
    }

    // Update password
    const newPasswordHash = await hashPassword(data.newPassword);
    await this.prisma.staff.update({
      where: { id: staffId },
      data: { passwordHash: newPasswordHash }
    });

    // Revoke all sessions after password change for security
    await staffSessionService.revokeAllUserSessions(staffId, 'password_changed', staffId);
  }

  /**
   * Initiate password reset
   */
  async forgotPassword(data: ForgotPasswordDTO): Promise<void> {
    const staff = await this.prisma.staff.findUnique({
      where: { email: data.email, isActive: true },
      select: { id: true, name: true }
    });

    if (staff) {
      const resetToken = generateResetToken();
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour

      // Store reset token (you'll need a PasswordReset model)
      // await this.prisma.passwordReset.create({
      //   data: { staffId: staff.id, token: resetToken, expiresAt }
      // });

      // TODO: Send email with reset link
      console.log(`Reset token for ${staff.id}: ${resetToken}`);
    }

    // Always return success (don't reveal if email exists)
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordDTO): Promise<void> {
    // TODO: Implement with PasswordReset model
    // const reset = await this.prisma.passwordReset.findUnique({
    //   where: { token: data.token },
    //   include: { staff: true }
    // });

    // if (!reset || reset.expiresAt < new Date()) {
    //   throw new ApiError(400, 'INVALID_TOKEN', 'Invalid or expired reset token');
    // }

    // const passwordHash = await hashPassword(data.newPassword);
    // await this.prisma.staff.update({
    //   where: { id: reset.staffId },
    //   data: { passwordHash }
    // });

    // await this.prisma.passwordReset.delete({ where: { id: reset.id } });
    
    throw new ApiError(501, 'NOT_IMPLEMENTED', 'Password reset not yet implemented');
  }

  /**
   * Get current user info
   */
  async getCurrentUser(staffId: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        restaurant: {
          select: { id: true, name: true, logoUrl: true }
        }
      }
    });

    if (!staff) {
      throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    }

    return staff;
  }
}