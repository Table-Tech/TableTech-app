import { z } from "zod";

export const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  notes: z.string().optional(),
  orderItems: z.array(
    z.object({
      menuItemId: z.string().uuid(),
      quantity: z.number().int().min(1),
      notes: z.string().optional(),
      modifiers: z.array(z.string().uuid()).optional(), // list of modifier IDs
    })
  ),
});
