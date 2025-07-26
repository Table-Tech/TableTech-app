// ===================== src/services/restaurant.service.ts =====================
import { Restaurant, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import {
  CreateRestaurantDTO,
  UpdateRestaurantDTO,
  RestaurantQueryDTO
} from '../schemas/restaurant.schema.js';
import { validateRestaurantPayload } from '../utils/logic-validation/restaurant.validation.js';

export class RestaurantService extends BaseService<
  Prisma.RestaurantCreateInput,
  Restaurant
> {
  protected model = 'restaurant' as const;

  /**
   * Create a new restaurant (admin only)
   */
  async createRestaurant(
    data: CreateRestaurantDTO,
    createdByStaffId: string
  ): Promise<Restaurant> {
    validateRestaurantPayload(data);

    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate email if provided
      if (data.email) {
        const existingEmail = await tx.restaurant.findUnique({
          where: { email: data.email },
          select: { id: true }
        });

        if (existingEmail) {
          throw new ApiError(409, 'EMAIL_EXISTS', 'Restaurant email already exists');
        }
      }

      // Create restaurant (removing slug and other non-existent fields)
      const restaurantData: any = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        logoUrl: data.logoUrl
      };

      return tx.restaurant.create({
        data: restaurantData
      });
    });
  }

  /**
   * Paginated list with optional fuzzy search
   */
  async list(query: RestaurantQueryDTO) {
    const { limit, offset, search } = query;
    const where: Prisma.RestaurantWhereInput = {
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        : undefined
    };

    const [total, items] = await Promise.all([
      this.prisma.restaurant.count({ where }),
      this.prisma.restaurant.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      restaurants: items,
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) }
    };
  }

  /** Update details */
  async updateRestaurant(id: string, data: UpdateRestaurantDTO): Promise<Restaurant> {
    validateRestaurantPayload(data);

    return this.prisma.$transaction(async (tx) => {
      // Check if restaurant exists
      const existing = await tx.restaurant.findUnique({
        where: { id },
        select: { id: true, email: true }
      });

      if (!existing) {
        throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
      }

      // Check for duplicate email if updating email
      if (data.email && data.email !== existing.email) {
        const emailExists = await tx.restaurant.findUnique({
          where: { email: data.email },
          select: { id: true }
        });

        if (emailExists) {
          throw new ApiError(409, 'EMAIL_EXISTS', 'Restaurant email already exists');
        }
      }

      // Prepare update data (removing non-existent fields)
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.email) updateData.email = data.email;
      if (data.phone) updateData.phone = data.phone;
      if (data.address) updateData.address = data.address;
      if (data.logoUrl) updateData.logoUrl = data.logoUrl;

      return tx.restaurant.update({ 
        where: { id }, 
        data: updateData 
      });
    });
  }

  /** Delete restaurant (hard delete since no soft delete field exists) */
  async archiveRestaurant(id: string): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!restaurant) {
        throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
      }

      // Check if restaurant has active orders or staff before deletion
      const [activeOrders, activeStaff] = await Promise.all([
        tx.order.count({
          where: { 
            restaurantId: id,
            status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
          }
        }),
        tx.staff.count({
          where: { restaurantId: id, isActive: true }
        })
      ]);

      if (activeOrders > 0) {
        throw new ApiError(400, 'HAS_ACTIVE_ORDERS', 'Cannot archive restaurant with active orders');
      }

      if (activeStaff > 0) {
        throw new ApiError(400, 'HAS_ACTIVE_STAFF', 'Cannot archive restaurant with active staff members');
      }

      // Since there's no soft delete, we'll perform a hard delete
      // In a real system, you'd want to add an isActive field to the schema
      await tx.restaurant.delete({
        where: { id }
      });
    });
  }

  /** Dashboard statistics */
  async getStatistics(id: string) {
    const [tables, menuItems, staff, todayOrders] = await Promise.all([
      this.prisma.table.count({ where: { restaurantId: id } }),
      this.prisma.menuItem.count({ where: { restaurantId: id } }),
      this.prisma.staff.count({ where: { restaurantId: id } }),
      this.prisma.order.count({
        where: {
          restaurantId: id,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999))
          },
          status: { not: 'CANCELLED' }
        }
      })
    ]);

    return { tables, menuItems, staff, todayOrders };
  }
}