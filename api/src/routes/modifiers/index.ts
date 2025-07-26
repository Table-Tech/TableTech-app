import { FastifyInstance } from 'fastify';
import { ModifierController } from '../../controllers/modifier.controller.js';
import {
  CreateModifierSchema,
  UpdateModifierSchema,
  ModifierQuerySchema,
  ModifierParamsSchema,
  ReorderModifiersSchema,
  BulkUpdateModifiersSchema
} from '../../schemas/modifier.schema.js';
import {
  validationMiddleware,
  validateParams,
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';

export default async function modifierRoutes(server: FastifyInstance) {
  const controller = new ModifierController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffModifierRoutes(server) {
    // All routes here require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/modifiers - Create modifier
    server.post('/modifiers', {
      preHandler: [
        validationMiddleware(CreateModifierSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.createModifier(req as any, reply));

    // GET /api/staff/modifiers - List modifiers with filters
    server.get('/modifiers', {
      preHandler: [validateQuery(ModifierQuerySchema)]
    }, (req, reply) => controller.listModifiers(req as any, reply));

    // GET /api/staff/modifiers/statistics - Modifier statistics
    server.get('/modifiers/statistics', {
      preHandler: [requireRole(['MANAGER', 'ADMIN'])]
    }, (req, reply) => controller.getModifierStatistics(req as any, reply));

    // GET /api/staff/modifiers/:id - Get modifier details
    server.get('/modifiers/:id', {
      preHandler: [validateParams(ModifierParamsSchema)]
    }, (req, reply) => controller.getModifierById(req as any, reply));

    // PATCH /api/staff/modifiers/:id - Update modifier
    server.patch('/modifiers/:id', {
      preHandler: [
        validateParams(ModifierParamsSchema),
        validationMiddleware(UpdateModifierSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.updateModifier(req as any, reply));

    // DELETE /api/staff/modifiers/:id - Delete modifier
    server.delete('/modifiers/:id', {
      preHandler: [
        validateParams(ModifierParamsSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.deleteModifier(req as any, reply));

    // POST /api/staff/modifiers/reorder - Reorder modifiers
    server.post('/modifiers/reorder', {
      preHandler: [
        validationMiddleware(ReorderModifiersSchema),
        requireRole(['MANAGER', 'ADMIN', 'CHEF'])
      ]
    }, (req, reply) => controller.reorderModifiers(req as any, reply));

    // PATCH /api/staff/modifiers/bulk - Bulk update modifiers
    server.patch('/modifiers/bulk', {
      preHandler: [
        validationMiddleware(BulkUpdateModifiersSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.bulkUpdateModifiers(req as any, reply));

  }, { prefix: '/staff' });
}