import { FastifyInstance } from 'fastify';
import { ModifierGroupController } from '../../controllers/modifier-group.controller.js';
import {
  CreateModifierGroupSchema,
  UpdateModifierGroupSchema,
  ModifierGroupQuerySchema,
  ModifierGroupParamsSchema,
  ReorderModifierGroupsSchema,
  BulkUpdateModifierGroupsSchema,
  GetModifierGroupsQuerySchema,
  ModifierGroupIdParamSchema
} from '../../schemas/modifier-group.schema.js';
import {
  validationMiddleware,
  validateParams,
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole } from '../../middleware/auth.middleware.js';

export default async function modifierGroupRoutes(server: FastifyInstance) {
  const controller = new ModifierGroupController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffModifierGroupRoutes(server) {
    // All routes here require authentication
    server.addHook('preHandler', requireUser);

    // POST /api/staff/modifier-groups - Create modifier group
    server.post('/modifier-groups', {
      preHandler: [
        validationMiddleware(CreateModifierGroupSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.createModifierGroup(req as any, reply));

    // GET /api/staff/modifier-groups - List modifier groups with filters
    server.get('/modifier-groups', {
      preHandler: [validateQuery(ModifierGroupQuerySchema)]
    }, (req, reply) => controller.listModifierGroups(req as any, reply));

    // GET /api/staff/modifier-groups/statistics - Modifier group statistics
    server.get('/modifier-groups/statistics', {
      preHandler: [requireRole(['MANAGER', 'ADMIN'])]
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
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.updateModifierGroup(req as any, reply));

    // DELETE /api/staff/modifier-groups/:id - Delete modifier group
    server.delete('/modifier-groups/:id', {
      preHandler: [
        validateParams(ModifierGroupParamsSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.deleteModifierGroup(req as any, reply));

    // POST /api/staff/modifier-groups/reorder - Reorder modifier groups
    server.post('/modifier-groups/reorder', {
      preHandler: [
        validationMiddleware(ReorderModifierGroupsSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.reorderModifierGroups(req as any, reply));

    // PATCH /api/staff/modifier-groups/bulk - Bulk update modifier groups
    server.patch('/modifier-groups/bulk', {
      preHandler: [
        validationMiddleware(BulkUpdateModifierGroupsSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.bulkUpdateModifierGroups(req as any, reply));

  }, { prefix: '/staff' });

  // =================== LEGACY ROUTES (for backward compatibility) ===================

  // GET /api/modifier-groups?menuItemId=xxx - Legacy get modifier groups endpoint
  server.get('/', {
    preHandler: [validateQuery(GetModifierGroupsQuerySchema)]
  }, (req, reply) => controller.getLegacyModifierGroups(req as any, reply));

  // POST /api/modifier-groups - Legacy create endpoint
  server.post('/', {
    preHandler: [validationMiddleware(CreateModifierGroupSchema)]
  }, (req, reply) => controller.createLegacyModifierGroup(req as any, reply));

  // GET /api/modifier-groups/:id - Legacy get modifier group endpoint
  server.get('/:id', {
    preHandler: [validateParams(ModifierGroupIdParamSchema)]
  }, (req, reply) => controller.getLegacyModifierGroupById(req as any, reply));

  // PUT /api/modifier-groups/:id - Legacy update endpoint
  server.put('/:id', {
    preHandler: [
      validateParams(ModifierGroupIdParamSchema),
      validationMiddleware(UpdateModifierGroupSchema)
    ]
  }, (req, reply) => controller.updateLegacyModifierGroup(req as any, reply));

  // DELETE /api/modifier-groups/:id - Legacy delete endpoint
  server.delete('/:id', {
    preHandler: [validateParams(ModifierGroupIdParamSchema)]
  }, (req, reply) => controller.deleteLegacyModifierGroup(req as any, reply));
}