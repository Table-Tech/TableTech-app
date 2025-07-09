import { Staff, Prisma } from "@prisma/client";
import { BaseService } from "./base.service.js";
import { hashPassword, validatePassword } from "../utils/password.js";
import { ApiError } from "../types/errors.js";

type CreateStaffInput = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";
  restaurantId: string;
};

export class StaffService extends BaseService<Prisma.StaffCreateInput, Staff> {
  protected model = 'staff' as const;

  /**
   * Create a new staff member with password hashing
   */
  async createStaff(data: CreateStaffInput): Promise<Staff> {
    const { name, email, password, role, restaurantId } = data;

    // Validate password strength using your utility
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new ApiError(
        400, 
        'WEAK_PASSWORD', 
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if staff with this email already exists
    const existingStaff = await this.prisma.staff.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingStaff) {
      throw new ApiError(409, 'EMAIL_EXISTS', 'Staff member with this email already exists');
    }

    // Hash the password using your utility
    const passwordHash = await hashPassword(password);

    // Transform the data to match Prisma.StaffCreateInput
    const staffCreateData: Prisma.StaffCreateInput = {
      name,
      email: normalizedEmail,
      passwordHash, // Use hashed password
      role,
      restaurant: {
        connect: { id: restaurantId } // Connect to existing restaurant
      }
    };

    // Create the staff member
    const staff = await this.prisma.staff.create({
      data: staffCreateData,
      include: {
        restaurant: {
          select: { id: true, name: true }
        }
      }
    });

    return staff;
  }

  /**
   * Find staff members by restaurant
   */
  async findByRestaurant(restaurantId: string): Promise<Staff[]> {
    return this.prisma.staff.findMany({
      where: { 
        restaurantId,
        isActive: true 
      },
      include: {
        restaurant: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Find staff member by ID
   */
  async findById(id: string): Promise<Staff | null> {
    return this.prisma.staff.findUnique({
      where: { id },
      include: {
        restaurant: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Update staff member
   */
  async update(id: string, data: Partial<CreateStaffInput>): Promise<Staff> {
    const { password, restaurantId, ...otherData } = data;
    
    const updateData: Prisma.StaffUpdateInput = {
      ...otherData
    };

    // If password is being updated, hash it
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        throw new ApiError(
          400, 
          'WEAK_PASSWORD', 
          `Password validation failed: ${passwordValidation.errors.join(', ')}`
        );
      }
      updateData.passwordHash = await hashPassword(password);
    }

    // If restaurant is being changed, update the relation
    if (restaurantId) {
      updateData.restaurant = {
        connect: { id: restaurantId }
      };
    }

    return this.prisma.staff.update({
      where: { id },
      data: updateData,
      include: {
        restaurant: {
          select: { id: true, name: true }
        }
      }
    });
  }
}