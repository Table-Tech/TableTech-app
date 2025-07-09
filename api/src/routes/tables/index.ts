import { FastifyInstance } from "fastify";
import {
  createTableHandler,
  getTablesHandler,
  updateTableStatusHandler,
  generateQRUrlHandler,
} from "../../controllers/table.controller";

export default async function tableRoutes(server: FastifyInstance) {
  // POST /api/tables - Create table
  server.post("/", createTableHandler);
  
  // GET /api/tables?restaurantId=xxx - Get tables by restaurant
  server.get("/", getTablesHandler);
  
  // PATCH /api/tables/:id/status - Update table status
  server.patch("/:id/status", updateTableStatusHandler);
  
  // GET /api/tables/:id/qr-url - Generate QR URL for table
  server.get("/:id/qr-url", generateQRUrlHandler);
}