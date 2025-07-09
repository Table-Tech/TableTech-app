import { z } from "zod";

export const CreateModifierSchema = z.object({
  name: z.string().min(1),
  modifierGroupId: z.string().uuid(),
  price: z.number().min(0),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const UpdateModifierSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const GetModifiersQuerySchema = z.object({
  modifierGroupId: z.string().uuid(),
});

export const ModifierIdParamSchema = z.object({
  id: z.string().uuid(),
});