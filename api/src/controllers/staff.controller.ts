import { FastifyReply } from "fastify";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { ApiError } from "../types/errors.js";
import { StaffService } from "../services/staff.service.js";
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  StaffIdParamSchema,
  GetStaffQuerySchema,
} from "../schemas/auth.schema.js";

export class StaffController {
  private svc = new StaffService();

  /** POST /staff */
  async create(
    req: AuthenticatedRequest<typeof CreateStaffSchema._type>,
    reply: FastifyReply
  ) {
    const staff = await this.svc.createStaff(req.body); // Changed from create to createStaff
    return reply.status(201).send({
      success: true,
      message: "Staff member created successfully",
      data: staff
    });
  }

  /** GET /staff */
  async list(
    req: AuthenticatedRequest<unknown, unknown, typeof GetStaffQuerySchema._type>,
    reply: FastifyReply
  ) {
    // Use restaurantId from query or authenticated user's restaurant
    const restaurantId = req.query?.restaurantId || req.user.restaurantId;
    
    if (!restaurantId) {
      throw new ApiError(400, 'MISSING_RESTAURANT_ID', 'Restaurant ID required');
    }

    const staff = await this.svc.findByRestaurant(restaurantId);
    return reply.send({ success: true, data: staff });
  }

  /** GET /staff/:id */
  async findById(
    req: AuthenticatedRequest<unknown, typeof StaffIdParamSchema._type>,
    reply: FastifyReply
  ) {
    const staff = await this.svc.findById(req.params.id);
    if (!staff) {
      throw new ApiError(404, 'NOT_FOUND', 'Staff member not found');
    }
    return reply.send({ success: true, data: staff });
  }

  /** PATCH /staff/:id */
  async update(
    req: AuthenticatedRequest<typeof UpdateStaffSchema._type, typeof StaffIdParamSchema._type>,
    reply: FastifyReply
  ) {
    const staff = await this.svc.update(req.params.id, req.body);
    return reply.send({
      success: true,
      message: "Staff member updated successfully",
      data: staff
    });
  }

  /** DELETE /staff/:id */
  async delete(
    req: AuthenticatedRequest<unknown, typeof StaffIdParamSchema._type>,
    reply: FastifyReply
  ) {
    await this.svc.delete(req.params.id);
    return reply.status(204).send();
  }
}

// Export handler functions for routes
const staffController = new StaffController();

export const createStaffHandler = (req: any, reply: FastifyReply) => staffController.create(req, reply);
export const getStaffHandler = (req: any, reply: FastifyReply) => staffController.list(req, reply);
export const getStaffByIdHandler = (req: any, reply: FastifyReply) => staffController.findById(req, reply);
export const updateStaffHandler = (req: any, reply: FastifyReply) => staffController.update(req, reply);
export const deleteStaffHandler = (req: any, reply: FastifyReply) => staffController.delete(req, reply);