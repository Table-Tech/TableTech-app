import { FastifyInstance } from 'fastify';
import { StaffController } from '../../controllers/staff.controller.js';
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  ChangePasswordSchema,
  StaffQuerySchema,
  StaffParamsSchema,
  BulkUpdateStaffSchema
} from '../../schemas/staff.schema.js';
import {
  validationMiddleware,
  validateParams,
  validateQuery,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';

export default async function staffRoutes(server: FastifyInstance) {
  const controller = new StaffController();

  // =================== STAFF ROUTES ===================
  server.register(async function staffManagementRoutes(server) {
    // All routes here require authentication and restaurant access
    server.addHook('preHandler', requireUser);
    server.addHook('preHandler', requireRestaurantAccess);

    // POST /api/staff/members - Create staff member
    server.post('/members', {
      preHandler: [
        validationMiddleware(CreateStaffSchema),
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
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
      preHandler: [requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])]
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
        requireRole(['MANAGER', 'ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.updateStaff(req as any, reply));

    // DELETE /api/staff/members/:id - Delete staff member
    server.delete('/members/:id', {
      preHandler: [
        validateParams(StaffParamsSchema),
        requireRole(['ADMIN', 'SUPER_ADMIN'])
      ]
    }, (req, reply) => controller.deleteStaff(req as any, reply));

    // PATCH /api/staff/members/bulk - Bulk update staff
    server.patch('/members/bulk', {
      preHandler: [
        validationMiddleware(BulkUpdateStaffSchema),
        requireRole(['ADMIN', 'SUPER_ADMIN'])
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
}