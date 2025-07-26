import { FastifyInstance } from 'fastify';
import { CategoryController } from '../../controllers/category.controller.js';
import { 
  CreateCategorySchema,
  UpdateCategorySchema,
  CategoryQuerySchema,
  CategoryParamsSchema,
  ReorderCategoriesSchema,
  BulkUpdateCategoriesSchema
} from '../../schemas/category.schema.js';
import { 
  validationMiddleware, 
  validateParams, 
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';

export default async function categoryRoutes(server: FastifyInstance) {
  const controller = new CategoryController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffCategoryRoutes(server) {
    // All routes here require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/categories - Create category
    server.post('/categories', {
      preHandler: [
        validationMiddleware(CreateCategorySchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.createCategory(req as any, reply));

    // GET /api/staff/categories - List categories with filters
    server.get('/categories', {
      preHandler: [validateQuery(CategoryQuerySchema)]
    }, (req, reply) => controller.listCategories(req as any, reply));

    // GET /api/staff/categories/full - Get full categories with menu items
    server.get('/categories/full', 
      (req, reply) => controller.getFullCategories(req as any, reply)
    );

    // GET /api/staff/categories/statistics - Category statistics
    server.get('/categories/statistics', {
      preHandler: [requireRole(['MANAGER', 'ADMIN'])]
    }, (req, reply) => controller.getCategoryStatistics(req as any, reply));

    // GET /api/staff/categories/:id - Get category details
    server.get('/categories/:id', {
      preHandler: [validateParams(CategoryParamsSchema)]
    }, (req, reply) => controller.getCategoryById(req as any, reply));

    // PATCH /api/staff/categories/:id - Update category
    server.patch('/categories/:id', {
      preHandler: [
        validateParams(CategoryParamsSchema),
        validationMiddleware(UpdateCategorySchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.updateCategory(req as any, reply));

    // DELETE /api/staff/categories/:id - Delete category
    server.delete('/categories/:id', {
      preHandler: [
        validateParams(CategoryParamsSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.deleteCategory(req as any, reply));

    // POST /api/staff/categories/reorder - Reorder categories
    server.post('/categories/reorder', {
      preHandler: [
        validationMiddleware(ReorderCategoriesSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.reorderCategories(req as any, reply));

    // PATCH /api/staff/categories/bulk - Bulk update categories
    server.patch('/categories/bulk', {
      preHandler: [
        validationMiddleware(BulkUpdateCategoriesSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.bulkUpdateCategories(req as any, reply));

  }, { prefix: '/staff' });
}