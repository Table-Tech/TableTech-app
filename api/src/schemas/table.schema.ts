import { z } from "zod";

export const CreateTableSchema = z.object({
  number: z.number().int(),
  code: z.string().min(1),
  capacity: z.number().int().optional(),
  restaurantId: z.string().uuid(),
  qrCodeUrl: z.string().url().optional(),
});

export const GetTablesQuerySchema = z.object({
  restaurantId: z.string().uuid(),
});

export const UpdateTableStatusSchema = z.object({
  status: z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"]),
});
