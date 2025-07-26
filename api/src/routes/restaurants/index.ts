import { FastifyInstance } from 'fastify';
import { RestaurantController } from '../../controllers/restaurant.controller.js';
import {
  CreateRestaurantSchema,
  UpdateRestaurantSchema,
  RestaurantQuerySchema,
  RestaurantParamsSchema
} from '../../schemas/restaurant.schema.js';
import {
  validationMiddleware,
  validateQuery,
  validateParams,
  rateLimit
} from '../../middleware/validation.middleware.js';
import { requireUser, requireRole, requireRestaurantAccess } from '../../middleware/auth.middleware.js';

export default async function restaurantRoutes(server: FastifyInstance) {
  const controller = new RestaurantController();

  // =================== RESTAURANT ROUTES ===================
  server.register(async function restaurantManagementRoutes(server) {
    // All routes here require authentication
    server.addHook('preHandler', requireUser);

    // POST /api/staff/restaurants - Create restaurant
    server.post('/restaurants', {
      preHandler: [
        validationMiddleware(CreateRestaurantSchema),
        requireRole(['ADMIN']),
        rateLimit(3, 3600000) // 3 attempts per hour
      ]
    }, (req, reply) => controller.createRestaurant(req as any, reply));

    // GET /api/staff/restaurants - List restaurants with filters
    server.get('/restaurants', {
      preHandler: [
        validateQuery(RestaurantQuerySchema),
        requireRole(['ADMIN', 'MANAGER'])
      ]
    }, (req, reply) => controller.listRestaurants(req as any, reply));

    // GET /api/staff/restaurants/:id - Get restaurant details
    server.get('/restaurants/:id', {
      preHandler: [
        validateParams(RestaurantParamsSchema),
        requireRestaurantAccess,
        requireRole(['ADMIN', 'MANAGER'])
      ]
    }, (req, reply) => controller.getRestaurantById(req as any, reply));

    // PATCH /api/staff/restaurants/:id - Update restaurant
    server.patch('/restaurants/:id', {
      preHandler: [
        validateParams(RestaurantParamsSchema),
        requireRestaurantAccess,
        validationMiddleware(UpdateRestaurantSchema),
        requireRole(['ADMIN'])
      ]
    }, (req, reply) => controller.updateRestaurant(req as any, reply));

    // DELETE /api/staff/restaurants/:id - Archive restaurant
    server.delete('/restaurants/:id', {
      preHandler: [
        validateParams(RestaurantParamsSchema),
        requireRestaurantAccess,
        requireRole(['ADMIN'])
      ]
    }, (req, reply) => controller.archiveRestaurant(req as any, reply));

    // GET /api/staff/restaurants/:id/statistics - Get restaurant statistics
    server.get('/restaurants/:id/statistics', {
      preHandler: [
        validateParams(RestaurantParamsSchema),
        requireRestaurantAccess,
        requireRole(['ADMIN', 'MANAGER'])
      ]
    }, (req, reply) => controller.getRestaurantStatistics(req as any, reply));

  }, { prefix: '/staff' });
}