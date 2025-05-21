import { z } from 'zod';

export const GetMenuQuerySchema = z.object({
  restaurantId: z.string().uuid()
});

export const CreateMenuItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  categoryId: z.string().uuid(),
  restaurantId: z.string().uuid(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number().int().optional(),
  displayOrder: z.number().int().optional(),
});