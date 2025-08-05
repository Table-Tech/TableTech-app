import { MenuItem, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import { 
  CreateMenuItemDTO, 
  UpdateMenuItemDTO,
  UpdateMenuItemAvailabilityDTO,
  MenuQueryDTO,
  BulkUpdateMenuItemsDTO,
  ReorderMenuItemsDTO
} from '../schemas/menu.schema.js';

export class MenuService extends BaseService<Prisma.MenuItemCreateInput, MenuItem> {
  protected model = 'menuItem' as const;

  /**
   * Create menu item
   */
  async createMenuItem(data: CreateMenuItemDTO, staffId: string): Promise<MenuItem> {
    return await this.prisma.$transaction(async (tx) => {
      // Check category exists and belongs to restaurant
      const category = await tx.menuCategory.findUnique({
        where: { id: data.categoryId },
        select: { id: true, restaurantId: true }
      });

      if (!category) {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Menu category not found');
      }

      if (category.restaurantId !== data.restaurantId) {
        throw new ApiError(400, 'CATEGORY_RESTAURANT_MISMATCH', 'Category does not belong to specified restaurant');
      }

      // Check for duplicate name within category
      const existing = await tx.menuItem.findFirst({
        where: {
          name: data.name,
          categoryId: data.categoryId,
          restaurantId: data.restaurantId
        },
        select: { id: true }
      });

      if (existing) {
        throw new ApiError(409, 'DUPLICATE_MENU_ITEM', 'Menu item with this name already exists in this category');
      }

      // Create menu item
      const menuItem = await tx.menuItem.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          imageUrl: data.imageUrl,
          isAvailable: data.isAvailable ?? true,
          preparationTime: data.preparationTime,
          displayOrder: data.displayOrder ?? 0,
          category: { connect: { id: data.categoryId } },
          restaurant: { connect: { id: data.restaurantId } }
        },
        include: this.getMenuItemIncludes()
      });

      return menuItem;
    });
  }

  /**
   * Update menu item
   */
  async updateMenuItem(
    itemId: string,
    data: UpdateMenuItemDTO,
    staffId: string
  ): Promise<MenuItem> {
    return await this.prisma.$transaction(async (tx) => {
      const menuItem = await tx.menuItem.findUnique({
        where: { id: itemId },
        include: { category: true }
      });

      if (!menuItem) {
        throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
      }

      // If updating category, validate it
      if (data.categoryId && data.categoryId !== menuItem.categoryId) {
        const newCategory = await tx.menuCategory.findUnique({
          where: { id: data.categoryId },
          select: { id: true, restaurantId: true }
        });

        if (!newCategory) {
          throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'New category not found');
        }

        if (newCategory.restaurantId !== menuItem.restaurantId) {
          throw new ApiError(400, 'CATEGORY_RESTAURANT_MISMATCH', 'Category does not belong to same restaurant');
        }
      }

      // Check for duplicate name if updating name
      if (data.name && data.name !== menuItem.name) {
        const categoryId = data.categoryId || menuItem.categoryId;
        const existing = await tx.menuItem.findFirst({
          where: {
            name: data.name,
            categoryId,
            restaurantId: menuItem.restaurantId,
            id: { not: itemId }
          },
          select: { id: true }
        });

        if (existing) {
          throw new ApiError(409, 'DUPLICATE_MENU_ITEM', 'Menu item with this name already exists in this category');
        }
      }

      // Update menu item
      const updated = await tx.menuItem.update({
        where: { id: itemId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.price && { price: data.price }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),
          ...(data.preparationTime !== undefined && { preparationTime: data.preparationTime }),
          ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
          ...(data.categoryId && { category: { connect: { id: data.categoryId } } })
        },
        include: this.getMenuItemIncludes()
      });

      return updated;
    });
  }

  /**
   * Update menu item availability (quick toggle)
   */
  async updateMenuItemAvailability(
    itemId: string,
    data: UpdateMenuItemAvailabilityDTO,
    staffId: string
  ): Promise<MenuItem> {
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: itemId },
      select: { id: true, restaurantId: true }
    });

    if (!menuItem) {
      throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
    }

    const updateData: any = {
      isAvailable: data.isAvailable,
      unavailableBy: staffId
    };

    // Track availability changes
    if (!data.isAvailable) {
      updateData.lastUnavailableAt = new Date();
      updateData.availabilityNote = data.availabilityNote || null;
    } else {
      // Clear unavailability data when making available again
      updateData.availabilityNote = null;
      updateData.lastUnavailableAt = null;
    }

    const updatedItem = await this.prisma.menuItem.update({
      where: { id: itemId },
      data: updateData,
      include: this.getMenuItemIncludes()
    });

    // Emit WebSocket event for availability change (if websocket service available)
    if (global.wsService) {
      try {
        // The WebSocket service already has this method from the websocket.service.ts
        global.wsService.emitMenuItemAvailabilityChange({
          id: updatedItem.id,
          name: updatedItem.name,
          available: data.isAvailable,
          categoryId: updatedItem.categoryId,
          price: updatedItem.price,
          restaurantId: updatedItem.restaurantId,
          updatedAt: updatedItem.updatedAt
        });
      } catch (error) {
        // Don't fail the request if WebSocket emission fails
        console.error('Failed to emit availability change event:', error);
      }
    }

    return updatedItem;
  }

  /**
   * Get menu items with filters and pagination
   */
  async getMenuItems(restaurantId: string, query: MenuQueryDTO) {
    const where: Prisma.MenuItemWhereInput = { restaurantId };

    // Apply filters
    if (query.categoryId) where.categoryId = query.categoryId;
    if (query.isAvailable !== undefined) where.isAvailable = query.isAvailable;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }
    if (query.minPrice || query.maxPrice) {
      where.price = {};
      if (query.minPrice) where.price.gte = query.minPrice;
      if (query.maxPrice) where.price.lte = query.maxPrice;
    }

    const [menuItems, total] = await Promise.all([
      this.prisma.menuItem.findMany({
        where,
        include: this.getMenuItemIncludes(),
        orderBy: [
          { displayOrder: 'asc' },
          { name: 'asc' }
        ],
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.menuItem.count({ where })
    ]);

    return {
      menuItems,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit)
      }
    };
  }

  /**
   * Get full menu by restaurant (organized by categories)
   */
  async getMenuByRestaurant(restaurantId: string) {
    return this.prisma.menuCategory.findMany({
      where: { 
        restaurantId,
        isActive: true 
      },
      orderBy: { displayOrder: 'asc' },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { displayOrder: 'asc' },
          include: {
            modifierGroups: {
              orderBy: { displayOrder: 'asc' },
              include: {
                modifiers: {
                  orderBy: { displayOrder: 'asc' }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get customer menu by table code (public access)
   */
  async getCustomerMenu(tableCode: string, restaurantId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // Validate table
      const table = await tx.table.findFirst({
        where: {
          code: tableCode,
          restaurantId
        },
        include: {
          restaurant: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              address: true,
              phone: true
            }
          }
        }
      });

      if (!table) {
        throw new ApiError(404, 'INVALID_TABLE_CODE', 'Invalid table code for this restaurant');
      }

      if (table.status === 'MAINTENANCE') {
        throw new ApiError(403, 'TABLE_MAINTENANCE', 'Table is currently under maintenance');
      }

      // Get restaurant tax rate
      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId },
        select: { taxRate: true }
      });
      const taxRate = restaurant?.taxRate ? Number(restaurant.taxRate) : 9.0; // Default to 9% Dutch BTW
      const taxMultiplier = 1 + (taxRate / 100);

      // Get menu
      const menuCategories = await tx.menuCategory.findMany({
        where: { 
          restaurantId,
          isActive: true 
        },
        orderBy: { displayOrder: 'asc' },
        include: {
          menuItems: {
            where: { isAvailable: true },
            orderBy: { displayOrder: 'asc' },
            include: {
              modifierGroups: {
                orderBy: { displayOrder: 'asc' },
                include: {
                  modifiers: {
                    orderBy: { displayOrder: 'asc' }
                  }
                }
              }
            }
          }
        }
      });

      console.log('🍕 DEBUG: Converting menu prices to tax-inclusive. Tax rate:', taxRate + '%', 'Multiplier:', taxMultiplier);

      // Convert prices to tax-inclusive for customer display
      const menu = menuCategories.map(category => ({
        ...category,
        menuItems: category.menuItems.map(item => ({
          ...item,
          price: Math.round(Number(item.price) * taxMultiplier * 100) / 100, // Round to 2 decimals
          modifierGroups: item.modifierGroups.map(group => ({
            ...group,
            modifiers: group.modifiers.map(modifier => ({
              ...modifier,
              price: Math.round(Number(modifier.price) * taxMultiplier * 100) / 100
            }))
          }))
        }))
      }));

      return {
        restaurant: table.restaurant,
        table: {
          id: table.id,
          number: table.number,
          code: table.code,
          capacity: table.capacity
        },
        menu
      };
    });
  }

  /**
   * Delete menu item
   */
  async deleteMenuItem(itemId: string, staffId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const menuItem = await tx.menuItem.findUnique({
        where: { id: itemId },
        select: { id: true }
      });

      if (!menuItem) {
        throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
      }

      // Check if item has been ordered (has order history)
      const orderCount = await tx.orderItem.count({
        where: { menuItemId: itemId }
      });

      if (orderCount > 0) {
        // Soft delete - just mark as unavailable
        await tx.menuItem.update({
          where: { id: itemId },
          data: { isAvailable: false }
        });
      } else {
        // Hard delete if no order history
        await tx.menuItem.delete({
          where: { id: itemId }
        });
      }
    });
  }

  /**
   * Bulk update menu items
   */
  async bulkUpdateMenuItems(
    data: BulkUpdateMenuItemsDTO,
    staffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all items exist
      const existingItems = await tx.menuItem.findMany({
        where: { id: { in: data.itemIds } },
        select: { id: true, restaurantId: true }
      });

      if (existingItems.length !== data.itemIds.length) {
        throw new ApiError(404, 'SOME_ITEMS_NOT_FOUND', 'Some menu items were not found');
      }

      // Validate all items belong to same restaurant
      const restaurantIds = [...new Set(existingItems.map(item => item.restaurantId))];
      if (restaurantIds.length > 1) {
        throw new ApiError(400, 'CROSS_RESTAURANT_UPDATE', 'Cannot update items from multiple restaurants');
      }

      // If updating category, validate it exists and belongs to same restaurant
      if (data.updates.categoryId) {
        const category = await tx.menuCategory.findUnique({
          where: { id: data.updates.categoryId },
          select: { id: true, restaurantId: true }
        });

        if (!category) {
          throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Target category not found');
        }

        if (category.restaurantId !== restaurantIds[0]) {
          throw new ApiError(400, 'CATEGORY_RESTAURANT_MISMATCH', 'Category does not belong to same restaurant');
        }
      }

      // Perform update
      const updateData: Prisma.MenuItemUpdateManyArgs['data'] = {};
      if (data.updates.isAvailable !== undefined) updateData.isAvailable = data.updates.isAvailable;
      if (data.updates.displayOrder !== undefined) updateData.displayOrder = data.updates.displayOrder;
      if (data.updates.categoryId) updateData.categoryId = data.updates.categoryId;

      const result = await tx.menuItem.updateMany({
        where: { id: { in: data.itemIds } },
        data: updateData
      });

      return { updated: result.count };
    });
  }

  /**
   * Reorder menu items within a category
   */
  async reorderMenuItems(
    data: ReorderMenuItemsDTO,
    staffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate category exists
      const category = await tx.menuCategory.findUnique({
        where: { id: data.categoryId },
        select: { id: true }
      });

      if (!category) {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }

      // Validate all items exist and belong to this category
      const itemIds = data.itemOrders.map(order => order.itemId);
      const existingItems = await tx.menuItem.findMany({
        where: { 
          id: { in: itemIds },
          categoryId: data.categoryId
        },
        select: { id: true }
      });

      if (existingItems.length !== itemIds.length) {
        throw new ApiError(400, 'INVALID_ITEMS', 'Some items do not exist or do not belong to this category');
      }

      // Update display orders
      let updated = 0;
      for (const order of data.itemOrders) {
        await tx.menuItem.update({
          where: { id: order.itemId },
          data: { displayOrder: order.displayOrder }
        });
        updated++;
      }

      return { updated };
    });
  }

  /**
   * Get menu statistics
   */
  async getMenuStatistics(restaurantId: string) {
    const [totalItems, availableItems, categoryStats] = await Promise.all([
      this.prisma.menuItem.count({ 
        where: { restaurantId } 
      }),
      this.prisma.menuItem.count({ 
        where: { restaurantId, isAvailable: true } 
      }),
      this.prisma.menuCategory.findMany({
        where: { restaurantId, isActive: true },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              menuItems: {
                where: { isAvailable: true }
              }
            }
          }
        }
      })
    ]);

    const unavailableItems = totalItems - availableItems;
    const availabilityRate = totalItems > 0 
      ? Math.round((availableItems / totalItems) * 100)
      : 0;

    return {
      totalItems,
      availableItems,
      unavailableItems,
      availabilityRate,
      categoriesWithItems: categoryStats.filter(cat => cat._count.menuItems > 0).length,
      totalCategories: categoryStats.length,
      categoryBreakdown: categoryStats.map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name,
        itemCount: cat._count.menuItems
      }))
    };
  }

  /**
   * Standard includes for menu item queries
   */
  private getMenuItemIncludes() {
    return {
      category: {
        select: { 
          id: true, 
          name: true,
          displayOrder: true
        }
      },
      restaurant: {
        select: { 
          id: true, 
          name: true 
        }
      },
      modifierGroups: {
        orderBy: { displayOrder: 'asc' as const },
        include: {
          modifiers: {
            orderBy: { displayOrder: 'asc' as const }
          }
        }
      }
    };
  }
}