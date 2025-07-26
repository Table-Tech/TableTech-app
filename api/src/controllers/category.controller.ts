import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { CategoryService } from '../services/category.service.js';
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryQuerySchema,
  CategoryParamsSchema,
  ReorderCategoriesSchema,
  BulkUpdateCategoriesSchema,
  GetCategoriesQuerySchema,
  CategoryIdParamSchema
} from '../schemas/category.schema.js';

export class CategoryController {
  private svc = new CategoryService();

  // =================== STAFF ENDPOINTS ===================

  /** POST /categories - Create category */
  async createCategory(
    req: AuthenticatedRequest<z.infer<typeof CreateCategorySchema>>,
    reply: FastifyReply
  ) {
    // Ensure user can only create categories for their restaurant
    if (req.body.restaurantId !== req.user.restaurantId) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot create categories for other restaurants');
    }

    const category = await this.svc.createCategory(req.body, req.user.staffId);
    return reply.status(201).send({ success: true, data: category });
  }

  /** GET /categories - List categories with filters */
  async listCategories(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof CategoryQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.getCategories(req.user.restaurantId, req.query);
    return reply.send({ 
      success: true, 
      data: result.categories,
      pagination: result.pagination
    });
  }

  /** GET /categories/full - Get full categories with menu items */
  async getFullCategories(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const categories = await this.svc.getCategoriesByRestaurant(req.user.restaurantId);
    return reply.send({ success: true, data: categories });
  }

  /** GET /categories/:id - Get category details */
  async getCategoryById(
    req: AuthenticatedRequest<unknown, z.infer<typeof CategoryParamsSchema>>,
    reply: FastifyReply
  ) {
    const category = await this.svc.findById(req.params.id);
    
    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
    
    // Verify category belongs to user's restaurant
    if (category.restaurantId !== req.user.restaurantId) {
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    }
    
    return reply.send({ success: true, data: category });
  }

  /** PATCH /categories/:id - Update category */
  async updateCategory(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateCategorySchema>,
      z.infer<typeof CategoryParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const category = await this.svc.updateCategory(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ success: true, data: category });
  }

  /** DELETE /categories/:id - Delete category */
  async deleteCategory(
    req: AuthenticatedRequest<unknown, z.infer<typeof CategoryParamsSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.deleteCategory(req.params.id, req.user.staffId);
    return reply.send({ success: true, message: 'Category deleted successfully' });
  }

  /** POST /categories/reorder - Reorder categories */
  async reorderCategories(
    req: AuthenticatedRequest<z.infer<typeof ReorderCategoriesSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.reorderCategories(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Reordered ${result.updated} categories`
    });
  }

  /** PATCH /categories/bulk - Bulk update categories */
  async bulkUpdateCategories(
    req: AuthenticatedRequest<z.infer<typeof BulkUpdateCategoriesSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.bulkUpdateCategories(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Updated ${result.updated} categories`
    });
  }

  /** GET /categories/statistics - Get category statistics */
  async getCategoryStatistics(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const stats = await this.svc.getCategoryStatistics(req.user.restaurantId);
    return reply.send({ success: true, data: stats });
  }

  // =================== LEGACY ENDPOINTS (for backward compatibility) ===================

  /** GET /menu-categories - Legacy endpoint for getting categories by restaurant */
  async getLegacyCategories(
    req: FastifyRequest<{ Querystring: z.infer<typeof GetCategoriesQuerySchema> }>,
    reply: FastifyReply
  ) {
    const categories = await this.svc.getCategoriesByRestaurant(req.query.restaurantId);
    return reply.send(categories);
  }

  /** GET /menu-categories/:id - Legacy get category endpoint */
  async getLegacyCategory(
    req: FastifyRequest<{ Params: z.infer<typeof CategoryIdParamSchema> }>,
    reply: FastifyReply
  ) {
    const category = await this.svc.findById(req.params.id);
    
    if (!category) {
      throw new ApiError(404, 'CATEGORY_NOT_FOUND', 'Category not found');
    }
    
    return reply.send(category);
  }

  /** POST /menu-categories - Legacy create endpoint */
  async createLegacyCategory(
    req: FastifyRequest<{ Body: z.infer<typeof CreateCategorySchema> }>,
    reply: FastifyReply
  ) {
    const category = await this.svc.createCategory(req.body, 'legacy-staff');
    return reply.status(201).send(category);
  }

  /** PUT /menu-categories/:id - Legacy update endpoint */
  async updateLegacyCategory(
    req: FastifyRequest<{ 
      Body: z.infer<typeof UpdateCategorySchema>;
      Params: z.infer<typeof CategoryIdParamSchema>;
    }>,
    reply: FastifyReply
  ) {
    const category = await this.svc.updateCategory(req.params.id, req.body, 'legacy-staff');
    return reply.send(category);
  }

  /** DELETE /menu-categories/:id - Legacy delete endpoint */
  async deleteLegacyCategory(
    req: FastifyRequest<{ Params: z.infer<typeof CategoryIdParamSchema> }>,
    reply: FastifyReply
  ) {
    await this.svc.deleteCategory(req.params.id, 'legacy-staff');
    return reply.status(204).send();
  }
}

