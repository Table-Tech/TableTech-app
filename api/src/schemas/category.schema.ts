import { z } from "zod";

export const CreateCategorySchema = z.object({
  name: z.string().min(1),
  restaurantId: z.string().uuid(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional().default(true),
});

export const UpdateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const GetCategoriesQuerySchema = z.object({
  restaurantId: z.string().uuid(),
});

export const CategoryIdParamSchema = z.object({
  id: z.string().uuid(),
});