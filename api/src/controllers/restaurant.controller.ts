// ===================== src/controllers/restaurant.controller.ts =====================
import { FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  CreateRestaurantSchema,
  UpdateRestaurantSchema,
  RestaurantQuerySchema,
  RestaurantIdParamSchema
} from '../schemas/restaurant.schema.js';
import { RestaurantService } from '../services/restaurant.service.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';

export class RestaurantController {
  private svc = new RestaurantService();

  // =================== RESTAURANT ENDPOINTS ===================

  /** POST /restaurants - Create restaurant */
  async createRestaurant(
    req: AuthenticatedRequest<z.infer<typeof CreateRestaurantSchema>>,
    reply: FastifyReply
  ) {
    const restaurant = await this.svc.createRestaurant(req.body, req.user.staffId);
    return reply.status(201).send({ 
      success: true, 
      message: 'Restaurant created successfully',
      data: restaurant 
    });
  }

  /** GET /restaurants - List restaurants with filters */
  async listRestaurants(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof RestaurantQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.list(req.query);
    return reply.send({ 
      success: true, 
      data: result.restaurants, 
      pagination: result.pagination 
    });
  }

  /** GET /restaurants/:id - Get restaurant details */
  async getRestaurantById(
    req: AuthenticatedRequest<unknown, z.infer<typeof RestaurantIdParamSchema>>,
    reply: FastifyReply
  ) {
    const restaurant = await this.svc.findById(req.params.id);
    if (!restaurant) {
      throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    }
    return reply.send({ success: true, data: restaurant });
  }

  /** PATCH /restaurants/:id - Update restaurant */
  async updateRestaurant(
    req: AuthenticatedRequest<z.infer<typeof UpdateRestaurantSchema>, z.infer<typeof RestaurantIdParamSchema>>,
    reply: FastifyReply
  ) {
    const restaurant = await this.svc.updateRestaurant(req.params.id, req.body);
    return reply.send({ 
      success: true, 
      message: 'Restaurant updated successfully',
      data: restaurant 
    });
  }

  /** DELETE /restaurants/:id - Archive restaurant */
  async archiveRestaurant(
    req: AuthenticatedRequest<unknown, z.infer<typeof RestaurantIdParamSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.archiveRestaurant(req.params.id);
    return reply.send({ 
      success: true, 
      message: 'Restaurant archived successfully' 
    });
  }

  /** GET /restaurants/:id/statistics - Get restaurant statistics */
  async getRestaurantStatistics(
    req: AuthenticatedRequest<unknown, z.infer<typeof RestaurantIdParamSchema>>,
    reply: FastifyReply
  ) {
    const stats = await this.svc.getStatistics(req.params.id);
    return reply.send({ success: true, data: stats });
  }

}