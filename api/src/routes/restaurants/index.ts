import { FastifyInstance } from "fastify";
import {
  createRestaurantHandler,
  getRestaurantHandler,
  listRestaurantsHandler,
} from "../../controllers/restaurant.controller";
import { CreateRestaurantSchema, RestaurantIdParamSchema } from "../../schemas/restaurant.schema";
import { validationMiddleware, validateParams } from "../../middleware/validation.middleware";

export default async function restaurantRoutes(server: FastifyInstance) {
  server.post("/", {
    preHandler: [validationMiddleware(CreateRestaurantSchema)]
  }, createRestaurantHandler);
  
  server.get("/", listRestaurantsHandler);
  
  server.get("/:id", {
    preHandler: [validateParams(RestaurantIdParamSchema)]
  }, getRestaurantHandler);
}
