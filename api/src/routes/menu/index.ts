import { FastifyInstance } from "fastify";
import { createMenuItemHandler, getMenuHandler } from "../../controllers/menu.controller";

export default async function menuRoutes(server: FastifyInstance) {
  server.post("/", createMenuItemHandler);
  server.get("/", getMenuHandler); // uses ?restaurantId=
}
