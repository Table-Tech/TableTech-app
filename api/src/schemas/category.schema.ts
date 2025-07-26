import { z } from 'zod';

// Create category
export const CreateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  imageUrl: z.string()
    .url('Invalid image URL')
    .max(500, 'Image URL too long')
    .optional(),
  displayOrder: z.number()
    .int('Display order must be whole number')
    .min(0, 'Display order must be non-negative')
    .default(0),
  isActive: z.boolean().default(true),
  restaurantId: z.string().uuid('Invalid restaurant ID')
});

// Update category
export const UpdateCategorySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  imageUrl: z.string()
    .url('Invalid image URL')
    .max(500, 'Image URL too long')
    .optional(),
  displayOrder: z.number()
    .int('Display order must be whole number')
    .min(0, 'Display order must be non-negative')
    .optional(),
  isActive: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Category query parameters
export const CategoryQuerySchema = z.object({
  isActive: z.boolean().optional(),
  includeItems: z.boolean().default(false),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

// Category params
export const CategoryParamsSchema = z.object({
  id: z.string().uuid('Invalid category ID')
});

// Reorder categories
export const ReorderCategoriesSchema = z.object({
  categoryOrders: z.array(z.object({
    categoryId: z.string().uuid('Invalid category ID'),
    displayOrder: z.number().int().min(0, 'Display order must be non-negative')
  }))
  .min(1, 'At least one category order is required')
  .max(50, 'Cannot reorder more than 50 categories at once')
});

// Bulk update categories
export const BulkUpdateCategoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid('Invalid category ID'))
    .min(1, 'At least one category ID is required')
    .max(20, 'Cannot update more than 20 categories at once'),
  updates: z.object({
    isActive: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field must be provided'
  })
});

// Type exports
export type CreateCategoryDTO = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof UpdateCategorySchema>;
export type CategoryQueryDTO = z.infer<typeof CategoryQuerySchema>;
export type ReorderCategoriesDTO = z.infer<typeof ReorderCategoriesSchema>;
export type BulkUpdateCategoriesDTO = z.infer<typeof BulkUpdateCategoriesSchema>;

// Legacy exports for backward compatibility
export const GetCategoriesQuerySchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID')
});

export const CategoryIdParamSchema = z.object({
  id: z.string().uuid('Invalid category ID')
});