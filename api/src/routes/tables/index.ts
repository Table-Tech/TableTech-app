import { FastifyInstance } from 'fastify';
import { TableController } from '../../controllers/table.controller.js';
import { 
  CreateTableSchema,
  BulkCreateTablesSchema,
  UpdateTableSchema,
  UpdateTableStatusSchema,
  TableQuerySchema,
  TableParamsSchema,
  ValidateTableSchema
} from '../../schemas/table.schema.js';
import { 
  validationMiddleware, 
  validateParams, 
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';

export default async function tableRoutes(server: FastifyInstance) {
  const controller = new TableController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffTableRoutes(server) {
    // All routes here require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/tables - Create single table
    server.post('/tables', {
      preHandler: [
        validationMiddleware(CreateTableSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.createTable(req as any, reply));

    // POST /api/staff/tables/bulk - Create multiple tables
    server.post('/tables/bulk', {
      preHandler: [
        validationMiddleware(BulkCreateTablesSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.bulkCreateTables(req as any, reply));

    // GET /api/staff/tables - List tables
    server.get('/tables', {
      preHandler: [validateQuery(TableQuerySchema)]
    }, (req, reply) => controller.listTables(req as any, reply));

    // GET /api/staff/tables/statistics - Table statistics
    server.get('/tables/statistics', {
      preHandler: [requireRole(['MANAGER', 'ADMIN'])]
    }, (req, reply) => controller.getTableStatistics(req as any, reply));

    // GET /api/staff/tables/:id - Get table details
    server.get('/tables/:id', {
      preHandler: [validateParams(TableParamsSchema)]
    }, (req, reply) => controller.getTableById(req as any, reply));

    // PATCH /api/staff/tables/:id - Update table
    server.patch('/tables/:id', {
      preHandler: [
        validateParams(TableParamsSchema),
        validationMiddleware(UpdateTableSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.updateTable(req as any, reply));

    // PATCH /api/staff/tables/:id/status - Update table status
    server.patch('/tables/:id/status', {
      preHandler: [
        validateParams(TableParamsSchema),
        validationMiddleware(UpdateTableStatusSchema)
      ]
    }, (req, reply) => controller.updateTableStatus(req as any, reply));

    // POST /api/staff/tables/:id/regenerate-qr - Regenerate QR code
    server.post('/tables/:id/regenerate-qr', {
      preHandler: [
        validateParams(TableParamsSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.regenerateQRCode(req as any, reply));

    // DELETE /api/staff/tables/:id - Delete table
    server.delete('/tables/:id', {
      preHandler: [
        validateParams(TableParamsSchema),
        requireRole(['ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.deleteTable(req as any, reply));

  }, { prefix: '/staff' });

  // =================== CUSTOMER ROUTES ===================
  server.register(async function customerTableRoutes(server) {
    // Apply rate limiting to all customer routes
    server.addHook('preHandler', rateLimit(30, 60000)); // 30 requests per minute

    // POST /api/customer/validate-table - Validate table code
    server.post('/validate-table', {
      preHandler: [
        validationMiddleware(ValidateTableSchema),
        rateLimit(10, 60000) // 10 validations per minute
      ]
    }, (req, reply) => controller.validateTable(req as any, reply));

  }, { prefix: '/customer' });
}