import { FastifyRequest, FastifyReply } from "fastify";
import {
  createTable,
  getTablesByRestaurantId,
  updateTableStatus,
  generateQRUrl,
} from "../services/table.service";
import {
  CreateTableSchema,
  GetTablesQuerySchema,
  UpdateTableStatusSchema,
} from "../schemas/table.schema";

export const createTableHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateTableSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  const table = await createTable(result.data);
  return reply.code(201).send(table);
};

export const getTablesHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = GetTablesQuerySchema.safeParse(req.query);
  if (!result.success) {
    return reply.status(400).send({ error: "Missing or invalid restaurantId" });
  }

  const tables = await getTablesByRestaurantId(result.data.restaurantId);
  return reply.send(tables);
};

export const updateTableStatusHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };

  const result = UpdateTableStatusSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid status" });
  }

  const updated = await updateTableStatus(id, result.data.status);
  return reply.send(updated);
};

// NEW: Generate QR URL for table
export const generateQRUrlHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };

  try {
    const qrData = await generateQRUrl(id);
    return reply.send(qrData);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return reply.status(404).send({ error: errorMessage });
  }
};