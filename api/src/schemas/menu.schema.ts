import { z } from 'zod';

// Price validation - must be positive with max 2 decimal places
const PriceSchema = z.number()
  .positive('Price must be positive')
  .max(9999.99, 'Price cannot exceed $9999.99')
  .refine(val => Number((val * 100).toFixed(0)) === val * 100, 'Price can have at most 2 decimal places');

// Create menu item
export const CreateMenuItemSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  price: PriceSchema,
  imageUrl: z.string()
    .url('Invalid image URL')
    .max(500, 'Image URL too long')
    .optional(),
  isAvailable: z.boolean().default(true),
  preparationTime: z.number()
    .int('Preparation time must be whole minutes')
    .min(1, 'Preparation time must be at least 1 minute')
    .max(180, 'Preparation time cannot exceed 3 hours')
    .optional(),
  displayOrder: z.number()
    .int('Display order must be whole number')
    .min(0, 'Display order must be non-negative')
    .default(0),
  categoryId: z.string().uuid('Invalid category ID'),
  restaurantId: z.string().uuid('Invalid restaurant ID')
});

// Update menu item
export const UpdateMenuItemSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  price: PriceSchema.optional(),
  imageUrl: z.string()
    .url('Invalid image URL')
    .max(500, 'Image URL too long')
    .optional(),
  isAvailable: z.boolean().optional(),
  preparationTime: z.number()
    .int('Preparation time must be whole minutes')
    .min(1, 'Preparation time must be at least 1 minute')
    .max(180, 'Preparation time cannot exceed 3 hours')
    .optional(),
  displayOrder: z.number()
    .int('Display order must be whole number')
    .min(0, 'Display order must be non-negative')
    .optional(),
  categoryId: z.string().uuid('Invalid category ID').optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Update menu item availability
export const UpdateMenuItemAvailabilitySchema = z.object({
  isAvailable: z.boolean()
});

// Menu query parameters
export const MenuQuerySchema = z.object({
  categoryId: z.string().uuid('Invalid category ID').optional(),
  isAvailable: z.boolean().optional(),
  search: z.string()
    .max(100, 'Search term too long')
    .trim()
    .optional(),
  minPrice: z.number().positive().optional(),
  maxPrice: z.number().positive().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
}).refine(data => !data.minPrice || !data.maxPrice || data.minPrice <= data.maxPrice, {
  message: 'Minimum price cannot be greater than maximum price'
});

// Menu item params
export const MenuItemParamsSchema = z.object({
  id: z.string().uuid('Invalid menu item ID')
});

// Customer menu params
export const CustomerMenuParamsSchema = z.object({
  tableCode: z.string()
    .min(1, 'Table code is required')
    .max(10, 'Table code too long')
    .transform(val => val.toUpperCase()),
  restaurantId: z.string().uuid('Invalid restaurant ID')
});

// Bulk operations
export const BulkUpdateMenuItemsSchema = z.object({
  itemIds: z.array(z.string().uuid('Invalid item ID'))
    .min(1, 'At least one item ID is required')
    .max(50, 'Cannot update more than 50 items at once'),
  updates: z.object({
    isAvailable: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    categoryId: z.string().uuid('Invalid category ID').optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field must be provided'
  })
});

// Menu item ordering
export const ReorderMenuItemsSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  itemOrders: z.array(z.object({
    itemId: z.string().uuid('Invalid item ID'),
    displayOrder: z.number().int().min(0, 'Display order must be non-negative')
  }))
  .min(1, 'At least one item order is required')
  .max(100, 'Cannot reorder more than 100 items at once')
});

// Type exports
export type CreateMenuItemDTO = z.infer<typeof CreateMenuItemSchema>;
export type UpdateMenuItemDTO = z.infer<typeof UpdateMenuItemSchema>;
export type UpdateMenuItemAvailabilityDTO = z.infer<typeof UpdateMenuItemAvailabilitySchema>;
export type MenuQueryDTO = z.infer<typeof MenuQuerySchema>;
export type BulkUpdateMenuItemsDTO = z.infer<typeof BulkUpdateMenuItemsSchema>;
export type ReorderMenuItemsDTO = z.infer<typeof ReorderMenuItemsSchema>;

// Legacy exports for backward compatibility (to be removed later)
export const GetMenuQuerySchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID')
});