import { FastifyRequest, FastifyReply } from "fastify";
import { createRestaurant, getRestaurantById, getAllRestaurants } from "../services/restaurant.service";
import { ApiError } from "../types/errors.js";
import { CreateRestaurantSchema, RestaurantIdParamSchema } from "../schemas/restaurant.schema";
import { z } from "zod";

type CreateRestaurantRequest = FastifyRequest<{ Body: z.infer<typeof CreateRestaurantSchema> }>;
type GetRestaurantRequest = FastifyRequest<{ Params: z.infer<typeof RestaurantIdParamSchema> }>;

export const createRestaurantHandler = async (req: CreateRestaurantRequest, reply: FastifyReply) => {
  // req.body is now validated by middleware
  const restaurant = await createRestaurant(req.body);
  return reply.status(201).send({ success: true, data: restaurant });
};

export const getRestaurantHandler = async (req: GetRestaurantRequest, reply: FastifyReply) => {
  // req.params is now validated by middleware
  const restaurant = await getRestaurantById(req.params.id);
  if (!restaurant) {
    throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
  }

  return reply.send({ success: true, data: restaurant });
};

export const listRestaurantsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const list = await getAllRestaurants();
  return reply.send({ success: true, data: list });
};
