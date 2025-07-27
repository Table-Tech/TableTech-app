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

type LoginResponse = {
  token: string;
  refreshToken: string;
  staff: {
    id: string;
    name: string;
    email: string;
    role: string;
    restaurant?: {
      id: string;
      name: string;
    };
  };
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

    return {
      token,
      refreshToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurant: staff.restaurant || undefined
      }
    };
  }

  /**
   * Login staff member
   */
  async login(data: LoginDTO): Promise<LoginResponse> {
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

    // Verify password
    const isValid = await comparePassword(data.password, staff.passwordHash);
    if (!isValid) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Generate tokens
    const tokenPayload: JWTPayload = {
      staffId: staff.id,
      restaurantId: staff.restaurantId,
      role: staff.role,
      email: staff.email
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Update last login to be implemented!!!

    return {
      token,
      refreshToken,
      staff: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role,
        restaurant: staff.restaurant || undefined
      }
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

      // Generate new tokens
      const newPayload: JWTPayload = {
        staffId: staff.id,
        restaurantId: staff.restaurantId,
        role: staff.role,
        email: staff.email
      };

      return {
        token: generateToken(newPayload),
        refreshToken: generateRefreshToken(newPayload)
      };

    } catch (error) {
      throw new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
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