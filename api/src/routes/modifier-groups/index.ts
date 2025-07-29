import { FastifyInstance } from 'fastify';
import { ModifierGroupController } from '../../controllers/modifier-group.controller.js';
import {
  CreateModifierGroupSchema,
  UpdateModifierGroupSchema,
  ModifierGroupQuerySchema,
  ModifierGroupParamsSchema,
  ReorderModifierGroupsSchema,
  BulkUpdateModifierGroupsSchema
} from '../../schemas/modifier-group.schema.js';
import {
  validationMiddleware,
  validateParams,
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';

export default async function modifierGroupRoutes(server: FastifyInstance) {
  const controller = new ModifierGroupController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffModifierGroupRoutes(server) {
    // All routes here require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/modifier-groups - Create modifier group
    server.post('/modifier-groups', {
      preHandler: [
        validationMiddleware(CreateModifierGroupSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.createModifierGroup(req as any, reply));

    // GET /api/staff/modifier-groups - List modifier groups with filters
    server.get('/modifier-groups', {
      preHandler: [validateQuery(ModifierGroupQuerySchema)]
    }, (req, reply) => controller.listModifierGroups(req as any, reply));

    // GET /api/staff/modifier-groups/statistics - Modifier group statistics
    server.get('/modifier-groups/statistics', {
      preHandler: [requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])]
    }, (req, reply) => controller.getModifierGroupStatistics(req as any, reply));

    // GET /api/staff/modifier-groups/:id - Get modifier group details
    server.get('/modifier-groups/:id', {
      preHandler: [validateParams(ModifierGroupParamsSchema)]
    }, (req, reply) => controller.getModifierGroupById(req as any, reply));

    // PATCH /api/staff/modifier-groups/:id - Update modifier group
    server.patch('/modifier-groups/:id', {
      preHandler: [
        validateParams(ModifierGroupParamsSchema),
        validationMiddleware(UpdateModifierGroupSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.updateModifierGroup(req as any, reply));

    // DELETE /api/staff/modifier-groups/:id - Delete modifier group
    server.delete('/modifier-groups/:id', {
      preHandler: [
        validateParams(ModifierGroupParamsSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.deleteModifierGroup(req as any, reply));

    // POST /api/staff/modifier-groups/reorder - Reorder modifier groups
    server.post('/modifier-groups/reorder', {
      preHandler: [
        validationMiddleware(ReorderModifierGroupsSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.reorderModifierGroups(req as any, reply));

    // PATCH /api/staff/modifier-groups/bulk - Bulk update modifier groups
    server.patch('/modifier-groups/bulk', {
      preHandler: [
        validationMiddleware(BulkUpdateModifierGroupsSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.bulkUpdateModifierGroups(req as any, reply));

  }, { prefix: '/staff' });
}