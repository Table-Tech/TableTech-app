import { FastifyInstance } from "fastify";
import {
  createTableHandler,
  getTablesHandler,
  updateTableStatusHandler,
} from "../../controllers/table.controller";

export default async function tableRoutes(server: FastifyInstance) {
  server.post("/", createTableHandler);
  server.get("/", getTablesHandler);
  server.patch("/:id/status", updateTableStatusHandler);
}
