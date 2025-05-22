import { FastifyInstance } from "fastify";
import {
  createRestaurantHandler,
  getRestaurantHandler,
  listRestaurantsHandler,
} from "../../controllers/restaurant.controller";

export default async function restaurantRoutes(server: FastifyInstance) {
  server.post("/", createRestaurantHandler);
  server.get("/", listRestaurantsHandler);
  server.get("/:id", getRestaurantHandler);
}
