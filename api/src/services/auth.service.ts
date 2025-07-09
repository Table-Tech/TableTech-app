import { Staff, Prisma } from "@prisma/client";
import { BaseService } from "./base.service.js";
import { comparePassword } from "../utils/password.js";
import { generateToken, JWTPayload } from "../utils/jwt.js";
import { ApiError } from "../types/errors.js";

type LoginInput = {
  email: string;
  password: string;
};

type LoginResponse = {
  token: string;
  staff: {
    id: string;
    name: string;
    email: string;
    role: string;
    restaurant: {
      id: string;
      name: string;
    };
  };
};

type StaffResponse = {
  id: string;
  name: string;
  email: string;
  role: string;
  restaurant: {
    id: string;
    name: string;
  };
};

export class AuthService extends BaseService<Prisma.StaffCreateInput, Staff> {
  protected model = 'staff' as const;

  /**
   * Authenticate staff member with email and password
   */
  async login(data: LoginInput): Promise<LoginResponse> {
    // Input validation
    if (!data.email || !data.password) {
      throw new ApiError(400, 'MISSING_CREDENTIALS', 'Email and password are required');
    }

    // Normalize email
    const email = data.email.toLowerCase().trim();
    
    if (!this.isValidEmail(email)) {
      throw new ApiError(400, 'INVALID_EMAIL', 'Invalid email format');
    }

    // Rate limiting check could be added here
    // this.checkLoginRateLimit(email);

    try {
      // Find staff member by email
      const staff = await this.prisma.staff.findUnique({
        where: { email },
        include: {
          restaurant: {
            select: { id: true, name: true }
          }
        }
      });

      if (!staff) {
        // Use same error message for security (don't reveal if email exists)
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      if (!staff.isActive) {
        throw new ApiError(401, 'ACCOUNT_DEACTIVATED', 'Account has been deactivated');
      }

      // Verify password
      const isPasswordValid = await comparePassword(data.password, staff.passwordHash);
      if (!isPasswordValid) {
        // Log failed login attempt for security monitoring
        this.logFailedLoginAttempt(email, 'invalid_password');
        throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // Generate JWT token
      const tokenPayload: JWTPayload = {
        staffId: staff.id,
        restaurantId: staff.restaurantId,
        role: staff.role,
        email: staff.email
      };

      const token = generateToken(tokenPayload);

      // Log successful login for audit
      this.logSuccessfulLogin(staff.id, staff.email);

      // Update last login timestamp (optional)
      await this.updateLastLogin(staff.id);

      return {
        token,
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          restaurant: staff.restaurant
        }
      };

    } catch (error) {
      // Re-throw ApiErrors
      if (error instanceof ApiError) {
        throw error;
      }

      // Log unexpected errors - TODO: Replace with proper logger
      throw new ApiError(500, 'LOGIN_ERROR', 'An error occurred during login');
    }
  }

  /**
   * Get staff member details from token payload
   */
  async getStaffFromToken(staffId: string): Promise<StaffResponse> {
    if (!staffId || !this.isValidUUID(staffId)) {
      throw new ApiError(400, 'INVALID_STAFF_ID', 'Invalid staff ID');
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: {
        restaurant: {
          select: { id: true, name: true }
        }
      }
    });

    if (!staff) {
      throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    }

    if (!staff.isActive) {
      throw new ApiError(401, 'ACCOUNT_DEACTIVATED', 'Account has been deactivated');
    }

    return {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      restaurant: staff.restaurant
    };
  }

  /**
   * Refresh JWT token for authenticated user
   */
  async refreshToken(currentPayload: JWTPayload): Promise<{ token: string }> {
    // Verify staff is still active
    const staff = await this.getStaffFromToken(currentPayload.staffId);
    
    // Generate new token with fresh expiration
    const newTokenPayload: JWTPayload = {
      staffId: staff.id,
      restaurantId: staff.restaurant.id,
      role: staff.role,
      email: staff.email
    };

    const token = generateToken(newTokenPayload);

    return { token };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(
    staffId: string, 
    currentPassword: string, 
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (!staffId || !this.isValidUUID(staffId)) {
      throw new ApiError(400, 'INVALID_STAFF_ID', 'Invalid staff ID');
    }

    if (!currentPassword || !newPassword) {
      throw new ApiError(400, 'MISSING_PASSWORDS', 'Current and new passwords are required');
    }

    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      select: { id: true, passwordHash: true, isActive: true, email: true }
    });

    if (!staff || !staff.isActive) {
      throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found or inactive');
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(currentPassword, staff.passwordHash);
    if (!isCurrentPasswordValid) {
      this.logFailedLoginAttempt(staff.email, 'invalid_current_password');
      throw new ApiError(401, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new ApiError(
        400, 
        'WEAK_PASSWORD', 
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Hash and update password
    const { hashPassword } = await import('../utils/password.js');
    const newPasswordHash = await hashPassword(newPassword);

    await this.prisma.staff.update({
      where: { id: staffId },
      data: { passwordHash: newPasswordHash }
    });

    // Log password change for security audit
    // TODO: Replace with proper logger

    return {
      success: true,
      message: 'Password changed successfully'
    };
  }

  /**
   * Initiate password reset (would send email in real implementation)
   */
  async initiatePasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!this.isValidEmail(normalizedEmail)) {
      throw new ApiError(400, 'INVALID_EMAIL', 'Invalid email format');
    }

    // Check if staff exists (but don't reveal if email exists for security)
    const staff = await this.prisma.staff.findUnique({
      where: { email: normalizedEmail, isActive: true },
      select: { id: true, name: true }
    });

    if (staff) {
      // In real implementation:
      // 1. Generate secure reset token
      // 2. Store token with expiration
      // 3. Send email with reset link
      
      // TODO: Replace with proper logger
    }

    // Always return success to not reveal if email exists
    return {
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    };
  }

  /**
   * Update last login timestamp
   */
  private async updateLastLogin(staffId: string): Promise<void> {
    try {
      await this.prisma.staff.update({
        where: { id: staffId },
        data: { updatedAt: new Date() } // Use updatedAt as last login for now
      });
    } catch (error) {
      // Non-critical operation, just log the error
      // TODO: Replace with proper logger
    }
  }

  /**
   * Log successful login for audit
   */
  private logSuccessfulLogin(staffId: string, email: string): void {
    // TODO: Replace with proper logger
  }

  /**
   * Log failed login attempt for security monitoring
   */
  private logFailedLoginAttempt(email: string, reason: string): void {
    // TODO: Replace with proper logger
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Basic password strength validation
   */
  private validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}