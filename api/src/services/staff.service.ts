import { Staff, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { hashPassword, validatePassword } from '../utils/password.js';
import { ApiError } from '../types/errors.js';
import { 
  CreateStaffDTO, 
  UpdateStaffDTO,
  ChangePasswordDTO,
  StaffQueryDTO,
  BulkUpdateStaffDTO
} from '../schemas/staff.schema.js';

export class StaffService extends BaseService<Prisma.StaffCreateInput, Staff> {
  protected model = 'staff' as const;

  /**
   * Create staff member
   */
  async createStaff(data: CreateStaffDTO, createdByStaffId: string): Promise<Staff> {
    return await this.prisma.$transaction(async (tx) => {
      // Check if email already exists
      const existing = await tx.staff.findUnique({
        where: { email: data.email },
        select: { id: true }
      });

      if (existing) {
        throw new ApiError(409, 'EMAIL_EXISTS', 'Staff member with this email already exists');
      }

      // Validate password strength
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.valid) {
        throw new ApiError(
          400, 
          'WEAK_PASSWORD', 
          `Password validation failed: ${passwordValidation.errors.join(', ')}`
        );
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create staff member
      const staff = await tx.staff.create({
        data: {
          name: data.name,
          email: data.email,
          passwordHash,
          role: data.role,
          restaurant: { connect: { id: data.restaurantId } }
        },
        include: this.getStaffIncludes()
      });

      return staff;
    });
  }

  /**
   * Update staff member
   */
  async updateStaff(
    staffId: string,
    data: UpdateStaffDTO,
    updatedByStaffId: string
  ): Promise<Staff> {
    return await this.prisma.$transaction(async (tx) => {
      const staff = await tx.staff.findUnique({
        where: { id: staffId },
        select: { id: true, email: true, restaurantId: true }
      });

      if (!staff) {
        throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
      }

      // Check for duplicate email if updating email
      if (data.email && data.email !== staff.email) {
        const existing = await tx.staff.findUnique({
          where: { email: data.email },
          select: { id: true }
        });

        if (existing) {
          throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
        }
      }

      // Prepare update data
      const updateData: Prisma.StaffUpdateInput = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.role) updateData.role = data.role;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      // Hash password if provided
      if (data.password) {
        const passwordValidation = validatePassword(data.password);
        if (!passwordValidation.valid) {
          throw new ApiError(
            400, 
            'WEAK_PASSWORD', 
            `Password validation failed: ${passwordValidation.errors.join(', ')}`
          );
        }
        updateData.passwordHash = await hashPassword(data.password);
      }

      // Update staff member
      const updated = await tx.staff.update({
        where: { id: staffId },
        data: updateData,
        include: this.getStaffIncludes()
      });

      return updated;
    });
  }

  /**
   * Change password (self-service)
   */
  async changePassword(
    staffId: string,
    data: ChangePasswordDTO
  ): Promise<void> {
    return await this.prisma.$transaction(async (tx) => {
      const staff = await tx.staff.findUnique({
        where: { id: staffId },
        select: { id: true, passwordHash: true }
      });

      if (!staff) {
        throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
      }

      // Verify current password
      const { comparePassword } = await import('../utils/password.js');
      const isValid = await comparePassword(data.currentPassword, staff.passwordHash);
      if (!isValid) {
        throw new ApiError(401, 'INVALID_PASSWORD', 'Current password is incorrect');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(data.newPassword);

      // Update password
      await tx.staff.update({
        where: { id: staffId },
        data: { passwordHash: newPasswordHash }
      });
    });
  }

  /**
   * Get staff with filters and pagination
   */
  async getStaff(restaurantId: string, query: StaffQueryDTO) {
    const where: Prisma.StaffWhereInput = { restaurantId };

    // Apply filters
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [staff, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        include: this.getStaffIncludes(),
        orderBy: [
          { role: 'asc' },
          { name: 'asc' }
        ],
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.staff.count({ where })
    ]);

    return {
      staff,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit)
      }
    };
  }

  /**
   * Get staff by restaurant (for simple listing)
   */
  async findByRestaurant(restaurantId: string): Promise<Staff[]> {
    return this.prisma.staff.findMany({
      where: { 
        restaurantId,
        isActive: true 
      },
      include: this.getStaffIncludes(),
      orderBy: [
        { role: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  /**
   * Delete staff member (soft delete)
   */
  async deleteStaff(staffId: string, deletedByStaffId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const staff = await tx.staff.findUnique({
        where: { id: staffId },
        select: { id: true, role: true }
      });

      if (!staff) {
        throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
      }

      // Prevent deleting the last admin
      if (staff.role === 'ADMIN') {
        const adminCount = await tx.staff.count({
          where: { role: 'ADMIN', isActive: true }
        });

        if (adminCount <= 1) {
          throw new ApiError(400, 'CANNOT_DELETE_LAST_ADMIN', 'Cannot delete the last admin');
        }
      }

      // Soft delete
      await tx.staff.update({
        where: { id: staffId },
        data: { isActive: false }
      });
    });
  }

  /**
   * Bulk update staff
   */
  async bulkUpdateStaff(
    data: BulkUpdateStaffDTO,
    updatedByStaffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all staff exist
      const existingStaff = await tx.staff.findMany({
        where: { id: { in: data.staffIds } },
        select: { id: true, restaurantId: true, role: true }
      });

      if (existingStaff.length !== data.staffIds.length) {
        throw new ApiError(404, 'SOME_STAFF_NOT_FOUND', 'Some staff members were not found');
      }

      // Validate all staff belong to same restaurant
      const restaurantIds = [...new Set(existingStaff.map(staff => staff.restaurantId))];
      if (restaurantIds.length > 1) {
        throw new ApiError(400, 'CROSS_RESTAURANT_UPDATE', 'Cannot update staff from multiple restaurants');
      }

      // If deactivating admins, ensure at least one remains active
      if (data.updates.isActive === false) {
        const adminIds = existingStaff
          .filter(staff => staff.role === 'ADMIN')
          .map(staff => staff.id);
        
        if (adminIds.length > 0) {
          const remainingActiveAdmins = await tx.staff.count({
            where: {
              role: 'ADMIN',
              isActive: true,
              id: { notIn: adminIds }
            }
          });

          if (remainingActiveAdmins === 0) {
            throw new ApiError(400, 'CANNOT_DEACTIVATE_ALL_ADMINS', 'Cannot deactivate all admins');
          }
        }
      }

      // Perform update
      const updateData: Prisma.StaffUpdateManyArgs['data'] = {};
      if (data.updates.isActive !== undefined) updateData.isActive = data.updates.isActive;
      if (data.updates.role) updateData.role = data.updates.role;

      const result = await tx.staff.updateMany({
        where: { id: { in: data.staffIds } },
        data: updateData
      });

      return { updated: result.count };
    });
  }

  /**
   * Get staff statistics
   */
  async getStaffStatistics(restaurantId: string) {
    const [totalStaff, activeStaff, roleStats] = await Promise.all([
      this.prisma.staff.count({ 
        where: { restaurantId } 
      }),
      this.prisma.staff.count({ 
        where: { restaurantId, isActive: true } 
      }),
      this.prisma.staff.groupBy({
        by: ['role'],
        where: { restaurantId, isActive: true },
        _count: true
      })
    ]);

    const inactiveStaff = totalStaff - activeStaff;

    return {
      totalStaff,
      activeStaff,
      inactiveStaff,
      roleBreakdown: roleStats.reduce((acc, stat) => {
        acc[stat.role] = stat._count;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Standard includes for staff queries
   */
  private getStaffIncludes() {
    return {
      restaurant: {
        select: { 
          id: true, 
          name: true 
        }
      }
    };
  }

  // Legacy method aliases for backward compatibility
  async findById(id: string): Promise<Staff | null> {
    return this.prisma.staff.findUnique({
      where: { id },
      include: this.getStaffIncludes()
    });
  }

  async update(id: string, data: Partial<CreateStaffDTO>): Promise<Staff> {
    return this.updateStaff(id, data as UpdateStaffDTO, 'legacy-staff');
  }

  async delete(id: string): Promise<void> {
    return this.deleteStaff(id, 'legacy-staff');
  }
}