import { FastifyRequest, FastifyReply } from "fastify";
import { CreateRestaurantSchema, RestaurantIdParamSchema } from "../schemas/restaurant.schema";
import { createRestaurant, getRestaurantById, getAllRestaurants } from "../services/restaurant.service";

export const createRestaurantHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateRestaurantSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  const restaurant = await createRestaurant(result.data);
  return reply.code(201).send(restaurant);
};

export const getRestaurantHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = RestaurantIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid ID" });
  }

  const restaurant = await getRestaurantById(result.data.id);
  if (!restaurant) return reply.status(404).send({ error: "Not found" });

  return reply.send(restaurant);
};

export const listRestaurantsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const list = await getAllRestaurants();
  return reply.send(list);
};
