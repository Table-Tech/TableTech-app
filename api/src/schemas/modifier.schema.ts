import { z } from 'zod';

// Price validation schema (reused from menu items)
const PriceSchema = z.number()
  .min(0, 'Price cannot be negative')
  .max(9999.99, 'Price cannot exceed $9999.99')
  .refine(val => Number((val * 100).toFixed(0)) === val * 100, {
    message: 'Price can have at most 2 decimal places'
  });

// Create modifier schema
export const CreateModifierSchema = z.object({
  name: z.string()
    .min(2, 'Modifier name must be at least 2 characters')
    .max(100, 'Modifier name must be less than 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Modifier name cannot be empty'),
  modifierGroupId: z.string()
    .uuid('Invalid modifier group ID'),
  price: PriceSchema,
  displayOrder: z.number()
    .int('Display order must be an integer')
    .min(0, 'Display order cannot be negative')
    .max(9999, 'Display order cannot exceed 9999')
    .default(0)
});

// Update modifier schema
export const UpdateModifierSchema = z.object({
  name: z.string()
    .min(2, 'Modifier name must be at least 2 characters')
    .max(100, 'Modifier name must be less than 100 characters')
    .trim()
    .optional(),
  price: PriceSchema.optional(),
  displayOrder: z.number()
    .int('Display order must be an integer')
    .min(0, 'Display order cannot be negative')
    .max(9999, 'Display order cannot exceed 9999')
    .optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Modifier query parameters
export const ModifierQuerySchema = z.object({
  modifierGroupId: z.string()
    .uuid('Invalid modifier group ID'),
  isActive: z.boolean().optional(),
  search: z.string()
    .max(100, 'Search term too long')
    .trim()
    .optional(),
  minPrice: z.number()
    .min(0, 'Minimum price cannot be negative')
    .optional(),
  maxPrice: z.number()
    .min(0, 'Maximum price cannot be negative')
    .optional(),
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(50),
  offset: z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0)
}).refine(data => {
  if (data.minPrice && data.maxPrice && data.minPrice > data.maxPrice) {
    return false;
  }
  return true;
}, {
  message: 'Minimum price cannot be greater than maximum price',
  path: ['minPrice']
});

// Reorder modifiers schema
export const ReorderModifiersSchema = z.object({
  modifierIds: z.array(z.string().uuid('Invalid modifier ID'))
    .min(1, 'At least one modifier ID is required')
    .max(50, 'Cannot reorder more than 50 modifiers at once')
});

// Bulk update modifiers schema
export const BulkUpdateModifiersSchema = z.object({
  modifierIds: z.array(z.string().uuid('Invalid modifier ID'))
    .min(1, 'At least one modifier ID is required')
    .max(20, 'Cannot update more than 20 modifiers at once'),
  updates: z.object({
    price: PriceSchema.optional(),
    isActive: z.boolean().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field must be provided'
  })
});

// Modifier params
export const ModifierParamsSchema = z.object({
  id: z.string().uuid('Invalid modifier ID')
});

// Legacy exports for backward compatibility
export const GetModifiersQuerySchema = ModifierQuerySchema;
export const ModifierIdParamSchema = ModifierParamsSchema;

// Type exports
export type CreateModifierDTO = z.infer<typeof CreateModifierSchema>;
export type UpdateModifierDTO = z.infer<typeof UpdateModifierSchema>;
export type ModifierQueryDTO = z.infer<typeof ModifierQuerySchema>;
export type ReorderModifiersDTO = z.infer<typeof ReorderModifiersSchema>;
export type BulkUpdateModifiersDTO = z.infer<typeof BulkUpdateModifiersSchema>;