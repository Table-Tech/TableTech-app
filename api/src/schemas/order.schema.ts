// src/schemas/order.schema.ts
import { z } from 'zod';

export const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  items: z
    .array(
      z.object({
        menuId: z.string().uuid(),
        quantity: z.number().int().min(1),
        modifiers: z.array(z.string().uuid()).optional(),
      })
    )
    .min(1),
});

export type CreateOrderDTO = z.infer<typeof CreateOrderSchema>;

// Optional params schema
export const OrderParamsSchema = z.object({
  id: z.string().uuid(),
});
export type OrderParamsDTO = z.infer<typeof OrderParamsSchema>;
