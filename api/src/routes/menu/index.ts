import { FastifyInstance } from 'fastify';
import { MenuController } from '../../controllers/menu.controller.js';
import { 
  CreateMenuItemSchema,
  UpdateMenuItemSchema,
  UpdateMenuItemAvailabilitySchema,
  MenuQuerySchema,
  MenuItemParamsSchema,
  CustomerMenuParamsSchema,
  BulkUpdateMenuItemsSchema,
  ReorderMenuItemsSchema
} from '../../schemas/menu.schema.js';
import { 
  validationMiddleware, 
  validateParams, 
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';

export default async function menuRoutes(server: FastifyInstance) {
  const controller = new MenuController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffMenuRoutes(server) {
    // All routes here require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/menu/items - Create menu item
    server.post('/items', {
      preHandler: [
        validationMiddleware(CreateMenuItemSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.createMenuItem(req as any, reply));

    // GET /api/staff/menu/items - List menu items with filters
    server.get('/items', {
      preHandler: [validateQuery(MenuQuerySchema)]
    }, (req, reply) => controller.listMenuItems(req as any, reply));

    // GET /api/staff/menu/full - Get full menu organized by categories
    server.get('/full', 
      (req, reply) => controller.getFullMenu(req as any, reply)
    );

    // GET /api/staff/menu/statistics - Menu statistics
    server.get('/statistics', {
      preHandler: [requireRole(['MANAGER', 'ADMIN'])]
    }, (req, reply) => controller.getMenuStatistics(req as any, reply));

    // GET /api/staff/menu/items/:id - Get menu item details
    server.get('/items/:id', {
      preHandler: [validateParams(MenuItemParamsSchema)]
    }, (req, reply) => controller.getMenuItemById(req as any, reply));

    // PATCH /api/staff/menu/items/:id - Update menu item
    server.patch('/items/:id', {
      preHandler: [
        validateParams(MenuItemParamsSchema),
        validationMiddleware(UpdateMenuItemSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.updateMenuItem(req as any, reply));

    // PATCH /api/staff/menu/items/:id/availability - Quick availability toggle
    server.patch('/items/:id/availability', {
      preHandler: [
        validateParams(MenuItemParamsSchema),
        validationMiddleware(UpdateMenuItemAvailabilitySchema)
      ]
    }, (req, reply) => controller.updateMenuItemAvailability(req as any, reply));

    // DELETE /api/staff/menu/items/:id - Delete menu item
    server.delete('/items/:id', {
      preHandler: [
        validateParams(MenuItemParamsSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.deleteMenuItem(req as any, reply));

    // PATCH /api/staff/menu/items/bulk - Bulk update menu items
    server.patch('/items/bulk', {
      preHandler: [
        validationMiddleware(BulkUpdateMenuItemsSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.bulkUpdateMenuItems(req as any, reply));

    // POST /api/staff/menu/items/reorder - Reorder menu items within category
    server.post('/items/reorder', {
      preHandler: [
        validationMiddleware(ReorderMenuItemsSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.reorderMenuItems(req as any, reply));

  }, { prefix: '/staff' });

  // =================== CUSTOMER ROUTES ===================
  server.register(async function customerMenuRoutes(server) {
    // Apply rate limiting to all customer routes
    server.addHook('preHandler', rateLimit(30, 60000)); // 30 requests per minute

    // GET /api/customer/menu/:tableCode/:restaurantId - Get customer menu
    server.get('/:tableCode/:restaurantId', {
      preHandler: [
        validateParams(CustomerMenuParamsSchema),
        rateLimit(10, 60000) // 10 menu requests per minute per IP
      ]
    }, (req, reply) => controller.getCustomerMenu(req as any, reply));

  }, { prefix: '/customer' });
}