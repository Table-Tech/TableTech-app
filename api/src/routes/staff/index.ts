import { FastifyInstance } from 'fastify';
import { StaffController } from '../../controllers/staff.controller.js';
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  ChangePasswordSchema,
  StaffQuerySchema,
  StaffParamsSchema,
  BulkUpdateStaffSchema,
  StaffIdParamSchema,
  GetStaffQuerySchema
} from '../../schemas/staff.schema.js';
import {
  validationMiddleware,
  validateParams,
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole } from '../../middleware/auth.middleware.js';

export default async function staffRoutes(server: FastifyInstance) {
  const controller = new StaffController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffManagementRoutes(server) {
    // All routes here require authentication
    server.addHook('preHandler', requireUser);

    // POST /api/staff/members - Create staff member
    server.post('/members', {
      preHandler: [
        validationMiddleware(CreateStaffSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.createStaff(req as any, reply));

    // GET /api/staff/members - List staff with filters
    server.get('/members', {
      preHandler: [validateQuery(StaffQuerySchema)]
    }, (req, reply) => controller.listStaff(req as any, reply));

    // GET /api/staff/members/simple - Simple staff list (for dropdowns)
    server.get('/members/simple',
      (req, reply) => controller.getSimpleStaffList(req as any, reply)
    );

    // GET /api/staff/members/statistics - Staff statistics
    server.get('/members/statistics', {
      preHandler: [requireRole(['MANAGER', 'ADMIN'])]
    }, (req, reply) => controller.getStaffStatistics(req as any, reply));

    // GET /api/staff/members/:id - Get staff details
    server.get('/members/:id', {
      preHandler: [validateParams(StaffParamsSchema)]
    }, (req, reply) => controller.getStaffById(req as any, reply));

    // PATCH /api/staff/members/:id - Update staff member
    server.patch('/members/:id', {
      preHandler: [
        validateParams(StaffParamsSchema),
        validationMiddleware(UpdateStaffSchema),
        requireRole(['MANAGER', 'ADMIN'])
      ]
    }, (req, reply) => controller.updateStaff(req as any, reply));

    // DELETE /api/staff/members/:id - Delete staff member
    server.delete('/members/:id', {
      preHandler: [
        validateParams(StaffParamsSchema),
        requireRole(['ADMIN'])
      ]
    }, (req, reply) => controller.deleteStaff(req as any, reply));

    // PATCH /api/staff/members/bulk - Bulk update staff
    server.patch('/members/bulk', {
      preHandler: [
        validationMiddleware(BulkUpdateStaffSchema),
        requireRole(['ADMIN'])
      ]
    }, (req, reply) => controller.bulkUpdateStaff(req as any, reply));

    // PATCH /api/staff/password - Change own password
    server.patch('/password', {
      preHandler: [
        validationMiddleware(ChangePasswordSchema),
        rateLimit(5, 900000) // 5 attempts per 15 minutes
      ]
    }, (req, reply) => controller.changePassword(req as any, reply));

  }, { prefix: '/staff' });

  // =================== LEGACY ROUTES (for backward compatibility) ===================

  // GET /api/staff?restaurantId=xxx - Legacy get staff endpoint
  server.get('/', {
    preHandler: [validateQuery(GetStaffQuerySchema)]
  }, (req, reply) => controller.getLegacyStaff(req as any, reply));

  // POST /api/staff - Legacy create endpoint
  server.post('/', {
    preHandler: [validationMiddleware(CreateStaffSchema)]
  }, (req, reply) => controller.createLegacyStaff(req as any, reply));

  // GET /api/staff/:id - Legacy get staff endpoint
  server.get('/:id', {
    preHandler: [validateParams(StaffIdParamSchema)]
  }, (req, reply) => controller.getLegacyStaffById(req as any, reply));

  // PUT /api/staff/:id - Legacy update endpoint
  server.put('/:id', {
    preHandler: [
      validateParams(StaffIdParamSchema),
      validationMiddleware(UpdateStaffSchema)
    ]
  }, (req, reply) => controller.updateLegacyStaff(req as any, reply));

  // DELETE /api/staff/:id - Legacy delete endpoint
  server.delete('/:id', {
    preHandler: [validateParams(StaffIdParamSchema)]
  }, (req, reply) => controller.deleteLegacyStaff(req as any, reply));
}