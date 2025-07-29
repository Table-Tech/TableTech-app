import { MenuCategory, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import { 
  CreateCategoryDTO, 
  UpdateCategoryDTO,
  CategoryQueryDTO,
  ReorderCategoriesDTO,
  BulkUpdateCategoriesDTO
} from '../schemas/category.schema.js';

export class CategoryService extends BaseService<Prisma.MenuCategoryCreateInput, MenuCategory> {
  protected model = 'menuCategory' as const;

  /**
   * Create category
   */
  async createCategory(data: CreateCategoryDTO, staffId: string): Promise<MenuCategory> {
    return await this.prisma.$transaction(async (tx) => {
      // Check for duplicate name within restaurant
      const existing = await tx.menuCategory.findFirst({
        where: {
          name: data.name,
          restaurantId: data.restaurantId,
          isActive: true
        },
        select: { id: true }
      });

      if (existing) {
        throw new ApiError(409, 'DUPLICATE_CATEGORY', 'Category with this name already exists');
      }

      // Create category
      const category = await tx.menuCategory.create({
        data: {
          name: data.name,
          description: data.description,
          imageUrl: data.imageUrl,
          displayOrder: data.displayOrder ?? 0,
          isActive: data.isActive ?? true,
          restaurant: { connect: { id: data.restaurantId } }
        },
        include: this.getCategoryIncludes()
      });

      return category;
    });
  }

  /**
   * Update category
   */
  async updateCategory(
    categoryId: string,
    data: UpdateCategoryDTO,
    staffId: string
  ): Promise<MenuCategory> {
    return await this.prisma.$transaction(async (tx) => {
      const category = await tx.menuCategory.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true, restaurantId: true }
      });

      if (!category) {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }

      // Check for duplicate name if updating name
      if (data.name && data.name !== category.name) {
        const existing = await tx.menuCategory.findFirst({
          where: {
            name: data.name,
            restaurantId: category.restaurantId,
            isActive: true,
            id: { not: categoryId }
          },
          select: { id: true }
        });

        if (existing) {
          throw new ApiError(409, 'DUPLICATE_CATEGORY', 'Category with this name already exists');
        }
      }

      // Update category
      const updated = await tx.menuCategory.update({
        where: { id: categoryId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
          ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        },
        include: this.getCategoryIncludes()
      });

      return updated;
    });
  }

  /**
   * Get categories with filters and pagination
   */
  async getCategories(restaurantId: string, query: CategoryQueryDTO) {
    const where: Prisma.MenuCategoryWhereInput = { restaurantId };

    if (query.isActive !== undefined) where.isActive = query.isActive;

    const include = query.includeItems ? {
      ...this.getCategoryIncludes(),
      menuItems: {
        where: { isAvailable: true },
        orderBy: { displayOrder: 'asc' as const },
        select: {
          id: true,
          name: true,
          price: true,
          isAvailable: true,
          displayOrder: true
        }
      }
    } : this.getCategoryIncludes();

    const [categories, total] = await Promise.all([
      this.prisma.menuCategory.findMany({
        where,
        include,
        orderBy: { displayOrder: 'asc' },
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.menuCategory.count({ where })
    ]);

    return {
      categories,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit)
      }
    };
  }

  /**
   * Get category by restaurant (for menu display)
   */
  async getCategoriesByRestaurant(restaurantId: string) {
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
              orderBy: { displayOrder: 'asc' as const },
              include: {
                modifiers: {
                  orderBy: { displayOrder: 'asc' as const }
                }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId: string, staffId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const category = await tx.menuCategory.findUnique({
        where: { id: categoryId },
        include: {
          _count: {
            select: { menuItems: true }
          }
        }
      });

      if (!category) {
        throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
      }

      // Check if category has menu items
      if (category._count.menuItems > 0) {
        throw new ApiError(400, 'CATEGORY_HAS_ITEMS', 'Cannot delete category with menu items');
      }

      // Soft delete
      await tx.menuCategory.update({
        where: { id: categoryId },
        data: { isActive: false }
      });
    });
  }

  /**
   * Reorder categories
   */
  async reorderCategories(
    data: ReorderCategoriesDTO,
    staffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all categories exist and belong to same restaurant
      const categoryIds = data.categoryOrders.map(order => order.categoryId);
      const existingCategories = await tx.menuCategory.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, restaurantId: true }
      });

      if (existingCategories.length !== categoryIds.length) {
        throw new ApiError(404, 'SOME_CATEGORIES_NOT_FOUND', 'Some categories were not found');
      }

      // Validate all categories belong to same restaurant
      const restaurantIds = [...new Set(existingCategories.map(cat => cat.restaurantId))];
      if (restaurantIds.length > 1) {
        throw new ApiError(400, 'CROSS_RESTAURANT_REORDER', 'Cannot reorder categories from multiple restaurants');
      }

      // Update display orders
      let updated = 0;
      for (const order of data.categoryOrders) {
        await tx.menuCategory.update({
          where: { id: order.categoryId },
          data: { displayOrder: order.displayOrder }
        });
        updated++;
      }

      return { updated };
    });
  }

  /**
   * Bulk update categories
   */
  async bulkUpdateCategories(
    data: BulkUpdateCategoriesDTO,
    staffId: string
  ): Promise<{ updated: number }> {
    return await this.prisma.$transaction(async (tx) => {
      // Validate all categories exist
      const existingCategories = await tx.menuCategory.findMany({
        where: { id: { in: data.categoryIds } },
        select: { id: true, restaurantId: true }
      });

      if (existingCategories.length !== data.categoryIds.length) {
        throw new ApiError(404, 'SOME_CATEGORIES_NOT_FOUND', 'Some categories were not found');
      }

      // Validate all categories belong to same restaurant
      const restaurantIds = [...new Set(existingCategories.map(cat => cat.restaurantId))];
      if (restaurantIds.length > 1) {
        throw new ApiError(400, 'CROSS_RESTAURANT_UPDATE', 'Cannot update categories from multiple restaurants');
      }

      // Perform update
      const updateData: Prisma.MenuCategoryUpdateManyArgs['data'] = {};
      if (data.updates.isActive !== undefined) updateData.isActive = data.updates.isActive;
      if (data.updates.displayOrder !== undefined) updateData.displayOrder = data.updates.displayOrder;

      const result = await tx.menuCategory.updateMany({
        where: { id: { in: data.categoryIds } },
        data: updateData
      });

      return { updated: result.count };
    });
  }

  /**
   * Get category statistics
   */
  async getCategoryStatistics(restaurantId: string) {
    const [totalCategories, activeCategories, categoryStats] = await Promise.all([
      this.prisma.menuCategory.count({ 
        where: { restaurantId } 
      }),
      this.prisma.menuCategory.count({ 
        where: { restaurantId, isActive: true } 
      }),
      this.prisma.menuCategory.findMany({
        where: { restaurantId, isActive: true },
        select: {
          id: true,
          name: true,
          displayOrder: true,
          _count: {
            select: {
              menuItems: {
                where: { isAvailable: true }
              }
            }
          }
        },
        orderBy: { displayOrder: 'asc' }
      })
    ]);

    const inactiveCategories = totalCategories - activeCategories;
    const categoriesWithItems = categoryStats.filter(cat => cat._count.menuItems > 0).length;
    const totalMenuItems = categoryStats.reduce((sum, cat) => sum + cat._count.menuItems, 0);

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
      categoriesWithItems,
      emptyCategoriesCount: activeCategories - categoriesWithItems,
      totalMenuItems,
      averageItemsPerCategory: activeCategories > 0 
        ? Math.round(totalMenuItems / activeCategories * 10) / 10
        : 0,
      categoryBreakdown: categoryStats.map(cat => ({
        categoryId: cat.id,
        categoryName: cat.name,
        displayOrder: cat.displayOrder,
        itemCount: cat._count.menuItems
      }))
    };
  }

  /**
   * Standard includes for category queries
   */
  private getCategoryIncludes() {
    return {
      restaurant: {
        select: { 
          id: true, 
          name: true 
        }
      },
      _count: {
        select: {
          menuItems: {
            where: { isAvailable: true }
          }
        }
      }
    };
  }
}