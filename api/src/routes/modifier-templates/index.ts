import { FastifyInstance } from 'fastify';
import { ModifierTemplateController } from '../../controllers/modifier-template.controller.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';
import { rateLimit } from '../../middleware/validation.middleware.js';

export default async function modifierTemplateRoutes(server: FastifyInstance) {
  const controller = new ModifierTemplateController();

  // =================== TEMPLATE MANAGEMENT ROUTES ===================
  server.register(async function templateRoutes(server) {
    // All routes require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/modifier-templates - Create template
    server.post('/modifier-templates', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.createTemplate(req as any, reply));

    // GET /api/staff/modifier-templates - List templates
    server.get('/modifier-templates', {
      preHandler: [rateLimit(200, 60000)] // 200 requests per minute for dev
    }, (req, reply) => controller.listTemplates(req as any, reply));

    // GET /api/staff/modifier-templates/:id - Get template details
    server.get('/modifier-templates/:id', {
      preHandler: [rateLimit(200, 60000)] // 200 requests per minute for dev
    }, (req, reply) => controller.getTemplate(req as any, reply));

    // PATCH /api/staff/modifier-templates/:id - Update template
    server.patch('/modifier-templates/:id', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.updateTemplate(req as any, reply));

    // DELETE /api/staff/modifier-templates/:id - Delete template
    server.delete('/modifier-templates/:id', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.deleteTemplate(req as any, reply));

    // =================== TEMPLATE OPTIONS ROUTES ===================

    // POST /api/staff/modifier-templates/:id/options - Add option
    server.post('/modifier-templates/:id/options', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.addOption(req as any, reply));

    // PATCH /api/staff/modifier-templates/:templateId/options/:optionId - Update option
    server.patch('/modifier-templates/:templateId/options/:optionId', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.updateOption(req as any, reply));

    // DELETE /api/staff/modifier-templates/:templateId/options/:optionId - Delete option
    server.delete('/modifier-templates/:templateId/options/:optionId', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.deleteOption(req as any, reply));

    // =================== MENU ITEM ASSIGNMENT ROUTES ===================

    // POST /api/staff/menu-items/:menuItemId/templates - Assign template
    server.post('/menu-items/:menuItemId/templates', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.assignTemplate(req as any, reply));

    // GET /api/staff/menu-items/:menuItemId/templates - Get assignments
    server.get('/menu-items/:menuItemId/templates', {
      preHandler: [rateLimit(200, 60000)] // 200 requests per minute for dev
    }, (req, reply) => controller.getMenuItemTemplates(req as any, reply));

    // DELETE /api/staff/menu-items/:menuItemId/templates/:templateId - Unassign
    server.delete('/menu-items/:menuItemId/templates/:templateId', {
      preHandler: [
        requireRole(['MANAGER', 'ADMIN', 'CHEF', 'SUPER_ADMIN']),
        rateLimit(100, 60000) // 100 requests per minute for dev
      ]
    }, (req, reply) => controller.unassignTemplate(req as any, reply));

    // GET /api/staff/menu-items/:menuItemId/modifiers/resolved - Customer view
    server.get('/menu-items/:menuItemId/modifiers/resolved', {
      preHandler: [rateLimit(200, 60000)] // 200 requests per minute for dev
    }, (req, reply) => controller.getResolvedModifiers(req as any, reply));

  }, { prefix: '/staff' });

  // =================== PUBLIC/CUSTOMER ROUTES ===================
  server.register(async function publicTemplateRoutes(server) {
    // GET /api/menu-items/:menuItemId/modifiers - Customer ordering
    server.get('/menu-items/:menuItemId/modifiers', {
      preHandler: [rateLimit(100, 60000)] // High limit for customer ordering
    }, (req, reply) => controller.getResolvedModifiers(req as any, reply));
  });
}