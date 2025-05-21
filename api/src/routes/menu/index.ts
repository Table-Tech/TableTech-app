import { FastifyInstance } from "fastify";
import { getMenuHandler, createMenuItemHandler  } from "../../controllers/menu.controller";

export default async function menuRoutes(server: FastifyInstance) {
  server.get("/", getMenuHandler);
  server.post("/", createMenuItemHandler);
}
