import { ModifierGroup, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import {
  CreateModifierGroupDTO,
  UpdateModifierGroupDTO,
  ModifierGroupQueryDTO,
  ReorderModifierGroupsDTO,
  BulkUpdateModifierGroupsDTO
} from '../schemas/modifier-group.schema.js';

export class ModifierGroupService extends BaseService<Prisma.ModifierGroupCreateInput, ModifierGroup> {
  protected model = 'modifierGroup' as const;

  /**
   * Create modifier group
   */
  async createModifierGroup(data: CreateModifierGroupDTO, createdByStaffId: string): Promise<ModifierGroup> {
    return await this.prisma.$transaction(async (tx) => {
      // Verify restaurant exists
      const restaurant = await tx.restaurant.findUnique({
        where: { id: data.restaurantId },
        select: { id: true, name: true }
      });

      if (!restaurant) {
        throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
      }

      // Check for duplicate name within the restaurant
      const existing = await tx.modifierGroup.findFirst({
        where: { 
          name: data.name, 
          menuItem: {
            restaurantId: data.restaurantId
          }
        }
      });

      if (existing) {
        throw new ApiError(409, 'DUPLICATE_NAME', 'Modifier group with this name already exists in this restaurant');
      }

      // For now, create a restaurant-level modifier group by using a placeholder approach
      // We'll need to find or create a placeholder menu item for this restaurant
      let placeholderMenuItem = await tx.menuItem.findFirst({
        where: {
          restaurantId: data.restaurantId,
          name: "__MODIFIER_GROUP_PLACEHOLDER__"
        }
      });

      if (!placeholderMenuItem) {
        // Create a hidden placeholder menu item for modifier groups
        placeholderMenuItem = await tx.menuItem.create({
          data: {
            name: "__MODIFIER_GROUP_PLACEHOLDER__",
            description: "Internal placeholder for restaurant-level modifier groups",
            price: 0,
            isAvailable: false,
            preparationTime: 0,
            restaurantId: data.restaurantId,
            categoryId: (await tx.menuCategory.findFirst({
              where: { restaurantId: data.restaurantId }
            }))?.id || (await tx.menuCategory.create({
              data: {
                name: "__PLACEHOLDER_CATEGORY__",
                description: "Internal placeholder category",
                displayOrder: 9999,
                restaurantId: data.restaurantId
              }
            })).id
          }
        });
      }

      // Create modifier group linked to placeholder menu item
      const modifierGroup = await tx.modifierGroup.create({
        data: {
          name: data.name,
          required: data.required,
          multiSelect: data.multiSelect,
          minSelect: data.minSelect,
          maxSelect: data.maxSelect,
          displayOrder: data.displayOrder,
          menuItemId: placeholderMenuItem.id
        },
        include: this.getModifierGroupIncludes()
      });

      return modifierGroup;
    });
  }

  /**
   * Get modifier groups with filters and pagination
   */
  async getModifierGroups(query: ModifierGroupQueryDTO) {
    const where: Prisma.ModifierGroupWhereInput = {};

    // Support both restaurant-level and menu item-specific queries
    if (query.restaurantId) {
      where.menuItem = {
        restaurantId: query.restaurantId,
        name: "__MODIFIER_GROUP_PLACEHOLDER__" // Get restaurant-level modifier groups
      };
    } else if (query.menuItemId) {
      where.menuItemId = query.menuItemId;
    }

    // Apply filters
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [modifierGroups, total] = await Promise.all([
      this.prisma.modifierGroup.findMany({
        where,
        include: this.getModifierGroupIncludes(),
        orderBy: [
          { displayOrder: 'asc' as const },
          { name: 'asc' as const }
        ],
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.modifierGroup.count({ where })
    ]);

    return {
      modifierGroups,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit)
      }
    };
  }

  /**
   * Update modifier group
   */
  async updateModifierGroup(
    id: string,
    data: UpdateModifierGroupDTO,
    updatedByStaffId: string
  ): Promise<ModifierGroup> {
    return await this.prisma.$transaction(async (tx) => {
      const modifierGroup = await tx.modifierGroup.findUnique({
        where: { id },
        select: { id: true, name: true, menuItemId: true }
      });

      if (!modifierGroup) {
        throw new ApiError(404, 'MODIFIER_GROUP_NOT_FOUND', 'Modifier group not found');
      }

      // Check for duplicate name if updating name
      if (data.name && data.name !== modifierGroup.name) {
        const existing = await tx.modifierGroup.findFirst({
          where: { 
            name: data.name, 
            menuItemId: modifierGroup.menuItemId,
            id: { not: id }
          }
        });

        if (existing) {
          throw new ApiError(409, 'DUPLICATE_NAME', 'Modifier group with this name already exists for this menu item');
        }
      }

      // Update modifier group
      const updated = await tx.modifierGroup.update({
        where: { id },
        data,
        include: this.getModifierGroupIncludes()
      });

      return updated;
    });
  }

  /**
   * Delete modifier group (with cascade handling)
   */
  async deleteModifierGroup(id: string, deletedByStaffId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const modifierGroup = await tx.modifierGroup.findUnique({
        where: { id },
        select: { id: true, _count: { select: { modifiers: true } } }
      });

      if (!modifierGroup) {
        throw new ApiError(404, 'MODIFIER_GROUP_NOT_FOUND', 'Modifier group not found');
      }

      // Check if there are active orders using modifiers from this group
      const activeOrderItems = await tx.orderItemModifier.count({
        where: {
          modifier: {
            modifierGroupId: id
          },
          orderItem: {
            order: {
              status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
            }
          }
        }
      });

      if (activeOrderItems > 0) {
        throw new ApiError(400, 'HAS_ACTIVE_ORDERS', 'Cannot delete modifier group with active orders');
      }

      // Delete all modifiers in this group first
      await tx.modifier.deleteMany({
        where: { modifierGroupId: id }
      });

      // Then delete the group
      await tx.modifierGroup.delete({
        where: { id }
      });
    });
  }

  /**
   * Reorder modifier groups
   */
  async reorderModifierGroups(
    data: ReorderModifierGroupsDTO,
    updatedByStaffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all modifier groups exist and belong to same menu item
      const modifierGroups = await tx.modifierGroup.findMany({
        where: { id: { in: data.modifierGroupIds } },
        select: { id: true, menuItemId: true }
      });

      if (modifierGroups.length !== data.modifierGroupIds.length) {
        throw new ApiError(404, 'SOME_MODIFIER_GROUPS_NOT_FOUND', 'Some modifier groups were not found');
      }

      const menuItemIds = [...new Set(modifierGroups.map(mg => mg.menuItemId))];
      if (menuItemIds.length > 1) {
        throw new ApiError(400, 'CROSS_MENU_ITEM_REORDER', 'Cannot reorder modifier groups from different menu items');
      }

      // Update display order for each modifier group
      let updated = 0;
      for (let i = 0; i < data.modifierGroupIds.length; i++) {
        await tx.modifierGroup.update({
          where: { id: data.modifierGroupIds[i] },
          data: { displayOrder: i }
        });
        updated++;
      }

      return { updated };
    });
  }

  /**
   * Bulk update modifier groups
   */
  async bulkUpdateModifierGroups(
    data: BulkUpdateModifierGroupsDTO,
    updatedByStaffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all modifier groups exist
      const existingGroups = await tx.modifierGroup.findMany({
        where: { id: { in: data.modifierGroupIds } },
        select: { id: true, menuItemId: true }
      });

      if (existingGroups.length !== data.modifierGroupIds.length) {
        throw new ApiError(404, 'SOME_MODIFIER_GROUPS_NOT_FOUND', 'Some modifier groups were not found');
      }

      // Perform bulk update
      const updateData: Prisma.ModifierGroupUpdateManyArgs['data'] = {};
      if (data.updates.required !== undefined) updateData.required = data.updates.required;
      if (data.updates.multiSelect !== undefined) updateData.multiSelect = data.updates.multiSelect;

      const result = await tx.modifierGroup.updateMany({
        where: { id: { in: data.modifierGroupIds } },
        data: updateData
      });

      return { updated: result.count };
    });
  }

  /**
   * Get modifier group statistics
   */
  async getModifierGroupStatistics(menuItemId: string) {
    const [totalGroups, requiredGroups, multiSelectGroups, totalModifiers] = await Promise.all([
      this.prisma.modifierGroup.count({ 
        where: { menuItemId } 
      }),
      this.prisma.modifierGroup.count({ 
        where: { menuItemId, required: true } 
      }),
      this.prisma.modifierGroup.count({ 
        where: { menuItemId, multiSelect: true } 
      }),
      this.prisma.modifier.count({
        where: { modifierGroup: { menuItemId } }
      })
    ]);

    return {
      totalGroups,
      requiredGroups,
      multiSelectGroups,
      optionalGroups: totalGroups - requiredGroups,
      singleSelectGroups: totalGroups - multiSelectGroups,
      totalModifiers,
      averageModifiersPerGroup: totalGroups > 0 ? Math.round(totalModifiers / totalGroups * 100) / 100 : 0
    };
  }

  /**
   * Standard includes for modifier group queries
   */
  private getModifierGroupIncludes() {
    return {
      modifiers: {
        orderBy: { displayOrder: 'asc' as const }
      },
      menuItem: {
        select: { 
          id: true, 
          name: true,
          restaurantId: true
        }
      }
    };
  }

  // Legacy method aliases for backward compatibility
  async findById(id: string): Promise<ModifierGroup | null> {
    return this.prisma.modifierGroup.findUnique({
      where: { id },
      include: this.getModifierGroupIncludes()
    });
  }

  async findByMenuItem(menuItemId: string): Promise<ModifierGroup[]> {
    return this.prisma.modifierGroup.findMany({
      where: { menuItemId },
      include: this.getModifierGroupIncludes(),
      orderBy: { displayOrder: 'asc' as const }
    });
  }

  async update(id: string, data: Partial<CreateModifierGroupDTO>): Promise<ModifierGroup> {
    return this.updateModifierGroup(id, data as UpdateModifierGroupDTO, 'legacy-staff');
  }

  async delete(id: string): Promise<void> {
    return this.deleteModifierGroup(id, 'legacy-staff');
  }

  /**
   * Assign modifier group to menu item (by cloning)
   */
  async assignModifierGroupToMenuItem(
    modifierGroupId: string, 
    menuItemId: string, 
    assignedByStaffId: string
  ): Promise<ModifierGroup> {
    return await this.prisma.$transaction(async (tx) => {
      // Get the original modifier group to clone
      const originalGroup = await tx.modifierGroup.findUnique({
        where: { id: modifierGroupId },
        include: {
          modifiers: {
            orderBy: { displayOrder: 'asc' as const }
          }
        }
      });

      if (!originalGroup) {
        throw new ApiError(404, 'MODIFIER_GROUP_NOT_FOUND', 'Modifier group not found');
      }

      // Verify the target menu item exists
      const menuItem = await tx.menuItem.findUnique({
        where: { id: menuItemId },
        select: { id: true, restaurantId: true }
      });

      if (!menuItem) {
        throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
      }

      // Check if this modifier group is already assigned to this menu item
      const existingAssignment = await tx.modifierGroup.findFirst({
        where: {
          name: originalGroup.name,
          menuItemId: menuItemId
        }
      });

      if (existingAssignment) {
        throw new ApiError(409, 'ALREADY_ASSIGNED', 'This modifier group is already assigned to this menu item');
      }

      // Clone the modifier group for the specific menu item
      const clonedGroup = await tx.modifierGroup.create({
        data: {
          name: originalGroup.name,
          required: originalGroup.required,
          multiSelect: originalGroup.multiSelect,
          minSelect: originalGroup.minSelect,
          maxSelect: originalGroup.maxSelect,
          displayOrder: originalGroup.displayOrder,
          menuItemId: menuItemId
        },
        include: this.getModifierGroupIncludes()
      });

      // Clone all modifiers in the group
      if (originalGroup.modifiers.length > 0) {
        await tx.modifier.createMany({
          data: originalGroup.modifiers.map(modifier => ({
            name: modifier.name,
            price: modifier.price,
            displayOrder: modifier.displayOrder,
            isActive: modifier.isActive,
            modifierGroupId: clonedGroup.id
          }))
        });
      }

      return clonedGroup;
    });
  }

  /**
   * Unassign modifier group from menu item (by deleting the clone)
   */
  async unassignModifierGroupFromMenuItem(
    modifierGroupId: string, 
    menuItemId: string, 
    unassignedByStaffId: string
  ): Promise<void> {
    return await this.prisma.$transaction(async (tx) => {
      // Find the modifier group assigned to this menu item
      const assignedGroup = await tx.modifierGroup.findFirst({
        where: {
          id: modifierGroupId,
          menuItemId: menuItemId
        }
      });

      if (!assignedGroup) {
        throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', 'This modifier group is not assigned to this menu item');
      }

      // Delete all modifiers in this group first (cascade)
      await tx.modifier.deleteMany({
        where: { modifierGroupId: assignedGroup.id }
      });

      // Delete the modifier group assignment (the cloned group)
      await tx.modifierGroup.delete({
        where: { id: assignedGroup.id }
      });
    });
  }
}