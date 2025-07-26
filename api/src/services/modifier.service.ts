import { Modifier, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import {
  CreateModifierDTO,
  UpdateModifierDTO,
  ModifierQueryDTO,
  ReorderModifiersDTO,
  BulkUpdateModifiersDTO
} from '../schemas/modifier.schema.js';
// Price formatting utility
const formatPrice = (price: number): number => {
  // Ensure price has max 2 decimal places
  return Math.round(price * 100) / 100;
};

export class ModifierService extends BaseService<Prisma.ModifierCreateInput, Modifier> {
  protected model = 'modifier' as const;

  /**
   * Create modifier
   */
  async createModifier(data: CreateModifierDTO, createdByStaffId: string): Promise<Modifier> {
    return await this.prisma.$transaction(async (tx) => {
      // Verify modifier group exists and get restaurant ID for validation
      const modifierGroup = await tx.modifierGroup.findUnique({
        where: { id: data.modifierGroupId },
        include: {
          menuItem: {
            select: { id: true, name: true, restaurantId: true }
          }
        }
      });

      if (!modifierGroup) {
        throw new ApiError(404, 'MODIFIER_GROUP_NOT_FOUND', 'Modifier group not found');
      }

      // Check for duplicate name within the modifier group
      const existing = await tx.modifier.findFirst({
        where: { 
          name: data.name, 
          modifierGroupId: data.modifierGroupId 
        }
      });

      if (existing) {
        throw new ApiError(409, 'DUPLICATE_NAME', 'Modifier with this name already exists in this group');
      }

      // Create modifier
      const modifier = await tx.modifier.create({
        data: {
          name: data.name,
          price: formatPrice(data.price),
          displayOrder: data.displayOrder,
          modifierGroup: { connect: { id: data.modifierGroupId } }
        },
        include: this.getModifierIncludes()
      });

      return modifier;
    });
  }

  /**
   * Get modifiers with filters and pagination
   */
  async getModifiers(query: ModifierQueryDTO) {
    const where: Prisma.ModifierWhereInput = {
      modifierGroupId: query.modifierGroupId
    };

    // Apply filters
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      where.price = {};
      if (query.minPrice !== undefined) where.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) where.price.lte = query.maxPrice;
    }

    const [modifiers, total] = await Promise.all([
      this.prisma.modifier.findMany({
        where,
        include: this.getModifierIncludes(),
        orderBy: [
          { displayOrder: 'asc' as const },
          { name: 'asc' as const }
        ],
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.modifier.count({ where })
    ]);

    return {
      modifiers,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit)
      }
    };
  }

  /**
   * Update modifier
   */
  async updateModifier(
    id: string,
    data: UpdateModifierDTO,
    updatedByStaffId: string
  ): Promise<Modifier> {
    return await this.prisma.$transaction(async (tx) => {
      const modifier = await tx.modifier.findUnique({
        where: { id },
        select: { id: true, name: true, modifierGroupId: true }
      });

      if (!modifier) {
        throw new ApiError(404, 'MODIFIER_NOT_FOUND', 'Modifier not found');
      }

      // Check for duplicate name if updating name
      if (data.name && data.name !== modifier.name) {
        const existing = await tx.modifier.findFirst({
          where: { 
            name: data.name, 
            modifierGroupId: modifier.modifierGroupId,
            id: { not: id }
          }
        });

        if (existing) {
          throw new ApiError(409, 'DUPLICATE_NAME', 'Modifier with this name already exists in this group');
        }
      }

      // Prepare update data
      const updateData: Prisma.ModifierUpdateInput = {};
      if (data.name) updateData.name = data.name;
      if (data.price !== undefined) updateData.price = formatPrice(data.price);
      if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

      // Update modifier
      const updated = await tx.modifier.update({
        where: { id },
        data: updateData,
        include: this.getModifierIncludes()
      });

      return updated;
    });
  }

  /**
   * Delete modifier (with cascade handling)
   */
  async deleteModifier(id: string, deletedByStaffId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const modifier = await tx.modifier.findUnique({
        where: { id },
        select: { id: true }
      });

      if (!modifier) {
        throw new ApiError(404, 'MODIFIER_NOT_FOUND', 'Modifier not found');
      }

      // Check if there are active orders using this modifier
      const activeOrderItems = await tx.orderItemModifier.count({
        where: {
          modifierId: id,
          orderItem: {
            order: {
              status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
            }
          }
        }
      });

      if (activeOrderItems > 0) {
        throw new ApiError(400, 'HAS_ACTIVE_ORDERS', 'Cannot delete modifier with active orders');
      }

      // Delete the modifier
      await tx.modifier.delete({
        where: { id }
      });
    });
  }

  /**
   * Reorder modifiers
   */
  async reorderModifiers(
    data: ReorderModifiersDTO,
    updatedByStaffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all modifiers exist and belong to same modifier group
      const modifiers = await tx.modifier.findMany({
        where: { id: { in: data.modifierIds } },
        select: { id: true, modifierGroupId: true }
      });

      if (modifiers.length !== data.modifierIds.length) {
        throw new ApiError(404, 'SOME_MODIFIERS_NOT_FOUND', 'Some modifiers were not found');
      }

      const modifierGroupIds = [...new Set(modifiers.map(m => m.modifierGroupId))];
      if (modifierGroupIds.length > 1) {
        throw new ApiError(400, 'CROSS_GROUP_REORDER', 'Cannot reorder modifiers from different groups');
      }

      // Update display order for each modifier
      let updated = 0;
      for (let i = 0; i < data.modifierIds.length; i++) {
        await tx.modifier.update({
          where: { id: data.modifierIds[i] },
          data: { displayOrder: i }
        });
        updated++;
      }

      return { updated };
    });
  }

  /**
   * Bulk update modifiers
   */
  async bulkUpdateModifiers(
    data: BulkUpdateModifiersDTO,
    updatedByStaffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all modifiers exist
      const existingModifiers = await tx.modifier.findMany({
        where: { id: { in: data.modifierIds } },
        select: { id: true, modifierGroupId: true }
      });

      if (existingModifiers.length !== data.modifierIds.length) {
        throw new ApiError(404, 'SOME_MODIFIERS_NOT_FOUND', 'Some modifiers were not found');
      }

      // Perform bulk update
      const updateData: Prisma.ModifierUpdateManyArgs['data'] = {};
      if (data.updates.price !== undefined) updateData.price = formatPrice(data.updates.price);

      const result = await tx.modifier.updateMany({
        where: { id: { in: data.modifierIds } },
        data: updateData
      });

      return { updated: result.count };
    });
  }

  /**
   * Get modifier statistics
   */
  async getModifierStatistics(modifierGroupId: string) {
    const [totalModifiers, avgPrice, priceRange, popularModifiers] = await Promise.all([
      this.prisma.modifier.count({ 
        where: { modifierGroupId } 
      }),
      this.prisma.modifier.aggregate({
        where: { modifierGroupId },
        _avg: { price: true }
      }),
      this.prisma.modifier.aggregate({
        where: { modifierGroupId },
        _min: { price: true },
        _max: { price: true }
      }),
      this.prisma.modifier.findMany({
        where: { modifierGroupId },
        include: {
          _count: {
            select: { orderItemModifiers: true }
          }
        },
        orderBy: {
          orderItemModifiers: {
            _count: 'desc'
          }
        },
        take: 5
      })
    ]);

    return {
      totalModifiers,
      averagePrice: avgPrice._avg.price ? Number(avgPrice._avg.price) : 0,
      priceRange: {
        min: priceRange._min.price ? Number(priceRange._min.price) : 0,
        max: priceRange._max.price ? Number(priceRange._max.price) : 0
      },
      popularModifiers: popularModifiers.map(modifier => ({
        id: modifier.id,
        name: modifier.name,
        price: Number(modifier.price),
        orderCount: modifier._count.orderItemModifiers
      }))
    };
  }

  /**
   * Standard includes for modifier queries
   */
  private getModifierIncludes() {
    return {
      modifierGroup: {
        select: { 
          id: true, 
          name: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              restaurantId: true
            }
          }
        }
      }
    };
  }

  // Legacy method aliases for backward compatibility
  async findById(id: string): Promise<Modifier | null> {
    return this.prisma.modifier.findUnique({
      where: { id },
      include: this.getModifierIncludes()
    });
  }

  async findByGroup(modifierGroupId: string): Promise<Modifier[]> {
    return this.prisma.modifier.findMany({
      where: { modifierGroupId },
      include: this.getModifierIncludes(),
      orderBy: { displayOrder: 'asc' as const }
    });
  }

  async update(id: string, data: Partial<CreateModifierDTO>): Promise<Modifier> {
    return this.updateModifier(id, data as UpdateModifierDTO, 'legacy-staff');
  }

  async delete(id: string): Promise<void> {
    return this.deleteModifier(id, 'legacy-staff');
  }
}