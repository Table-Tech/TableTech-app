import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest, getRestaurantId } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { StaffService } from '../services/staff.service.js';
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  ChangePasswordSchema,
  StaffQuerySchema,
  StaffParamsSchema,
  BulkUpdateStaffSchema,
  StaffIdParamSchema,
  GetStaffQuerySchema
} from '../schemas/staff.schema.js';

export class StaffController {
  private svc = new StaffService();

  // =================== STAFF ENDPOINTS ===================

  /** POST /staff - Create staff member */
  async createStaff(
    req: AuthenticatedRequest<z.infer<typeof CreateStaffSchema>>,
    reply: FastifyReply
  ) {
    // Ensure user can only create staff for their restaurant
    if (req.body.restaurantId !== getRestaurantId(req)) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot create staff for other restaurants');
    }

    const staff = await this.svc.createStaff(req.body, req.user.staffId);
    return reply.status(201).send({ 
      success: true, 
      message: 'Staff member created successfully',
      data: staff 
    });
  }

  /** GET /staff - List staff with filters */
  async listStaff(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof StaffQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.getStaff(getRestaurantId(req), req.query);
    return reply.send({ 
      success: true, 
      data: result.staff,
      pagination: result.pagination
    });
  }

  /** GET /staff/simple - Simple staff list (for dropdowns) */
  async getSimpleStaffList(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const staff = await this.svc.findByRestaurant(getRestaurantId(req));
    return reply.send({ success: true, data: staff });
  }

  /** GET /staff/:id - Get staff details */
  async getStaffById(
    req: AuthenticatedRequest<unknown, z.infer<typeof StaffParamsSchema>>,
    reply: FastifyReply
  ) {
    const staff = await this.svc.findById(req.params.id);
    
    if (!staff) {
      throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    }
    
    // Verify staff belongs to user's restaurant
    if (staff.restaurantId !== getRestaurantId(req)) {
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    }
    
    return reply.send({ success: true, data: staff });
  }

  /** PATCH /staff/:id - Update staff member */
  async updateStaff(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateStaffSchema>,
      z.infer<typeof StaffParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const staff = await this.svc.updateStaff(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ 
      success: true, 
      message: 'Staff member updated successfully',
      data: staff 
    });
  }

  /** DELETE /staff/:id - Delete staff member */
  async deleteStaff(
    req: AuthenticatedRequest<unknown, z.infer<typeof StaffParamsSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.deleteStaff(req.params.id, req.user.staffId);
    return reply.send({ success: true, message: 'Staff member deleted successfully' });
  }

  /** PATCH /staff/bulk - Bulk update staff */
  async bulkUpdateStaff(
    req: AuthenticatedRequest<z.infer<typeof BulkUpdateStaffSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.bulkUpdateStaff(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Updated ${result.updated} staff members`
    });
  }

  /** GET /staff/statistics - Get staff statistics */
  async getStaffStatistics(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const stats = await this.svc.getStaffStatistics(getRestaurantId(req));
    return reply.send({ success: true, data: stats });
  }

  /** PATCH /staff/password - Change own password */
  async changePassword(
    req: AuthenticatedRequest<z.infer<typeof ChangePasswordSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.changePassword(req.user.staffId, req.body);
    return reply.send({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  }

  // =================== LEGACY ENDPOINTS (for backward compatibility) ===================

  /** GET /staff - Legacy endpoint */
  async getLegacyStaff(
    req: FastifyRequest<{ Querystring: z.infer<typeof GetStaffQuerySchema> }>,
    reply: FastifyReply
  ) {
    const restaurantId = req.query.restaurantId;
    if (!restaurantId) {
      throw new ApiError(400, 'MISSING_RESTAURANT_ID', 'Restaurant ID required');
    }

    const staff = await this.svc.findByRestaurant(restaurantId);
    return reply.send(staff);
  }

  /** GET /staff/:id - Legacy get staff endpoint */
  async getLegacyStaffById(
    req: FastifyRequest<{ Params: z.infer<typeof StaffIdParamSchema> }>,
    reply: FastifyReply
  ) {
    const staff = await this.svc.findById(req.params.id);
    
    if (!staff) {
      throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
    }
    
    return reply.send(staff);
  }

  /** POST /staff - Legacy create endpoint */
  async createLegacyStaff(
    req: FastifyRequest<{ Body: z.infer<typeof CreateStaffSchema> }>,
    reply: FastifyReply
  ) {
    const staff = await this.svc.createStaff(req.body, 'legacy-staff');
    return reply.status(201).send({
      success: true,
      message: 'Staff member created successfully',
      data: staff
    });
  }

  /** PUT /staff/:id - Legacy update endpoint */
  async updateLegacyStaff(
    req: FastifyRequest<{ 
      Body: z.infer<typeof UpdateStaffSchema>;
      Params: z.infer<typeof StaffIdParamSchema>;
    }>,
    reply: FastifyReply
  ) {
    const staff = await this.svc.updateStaff(req.params.id, req.body, 'legacy-staff');
    return reply.send({
      success: true,
      message: 'Staff member updated successfully',
      data: staff
    });
  }

  /** DELETE /staff/:id - Legacy delete endpoint */
  async deleteLegacyStaff(
    req: FastifyRequest<{ Params: z.infer<typeof StaffIdParamSchema> }>,
    reply: FastifyReply
  ) {
    await this.svc.deleteStaff(req.params.id, 'legacy-staff');
    return reply.status(204).send();
  }
}

