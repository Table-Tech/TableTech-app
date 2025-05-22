import { z } from "zod";

export const CreateRestaurantSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  logoUrl: z.string().url().optional(),
});

export const RestaurantIdParamSchema = z.object({
  id: z.string().uuid(),
});
