import { z } from "zod";

export const CreateModifierGroupSchema = z.object({
  name: z.string().min(1),
  menuItemId: z.string().uuid(),
  required: z.boolean().optional().default(false),
  multiSelect: z.boolean().optional().default(false),
  minSelect: z.number().int().min(0).optional().default(0),
  maxSelect: z.number().int().min(1).optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const UpdateModifierGroupSchema = z.object({
  name: z.string().min(1).optional(),
  required: z.boolean().optional(),
  multiSelect: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const GetModifierGroupsQuerySchema = z.object({
  menuItemId: z.string().uuid(),
});

export const ModifierGroupIdParamSchema = z.object({
  id: z.string().uuid(),
});