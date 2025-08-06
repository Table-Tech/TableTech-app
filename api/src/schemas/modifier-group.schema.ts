import { z } from 'zod';

// Create modifier group schema
export const CreateModifierGroupSchema = z.object({
  name: z.string()
    .min(2, 'Modifier group name must be at least 2 characters')
    .max(100, 'Modifier group name must be less than 100 characters')
    .trim()
    .refine(val => val.length > 0, 'Modifier group name cannot be empty'),
  restaurantId: z.string()
    .uuid('Invalid restaurant ID'),
  required: z.boolean()
    .default(false),
  multiSelect: z.boolean()
    .default(false),
  minSelect: z.number()
    .int('Minimum selection must be an integer')
    .min(0, 'Minimum selection cannot be negative')
    .max(50, 'Minimum selection cannot exceed 50')
    .default(0),
  maxSelect: z.number()
    .int('Maximum selection must be an integer')
    .min(1, 'Maximum selection must be at least 1')
    .max(50, 'Maximum selection cannot exceed 50')
    .optional(),
  displayOrder: z.number()
    .int('Display order must be an integer')
    .min(0, 'Display order cannot be negative')
    .max(9999, 'Display order cannot exceed 9999')
    .default(0)
}).refine(data => {
  if (data.maxSelect && data.minSelect > data.maxSelect) {
    return false;
  }
  return true;
}, {
  message: 'Minimum selection cannot be greater than maximum selection',
  path: ['minSelect']
}).refine(data => {
  if (!data.multiSelect && data.maxSelect && data.maxSelect > 1) {
    return false;
  }
  return true;
}, {
  message: 'Single select groups cannot have maximum selection greater than 1',
  path: ['maxSelect']
});

// Update modifier group schema
export const UpdateModifierGroupSchema = z.object({
  name: z.string()
    .min(2, 'Modifier group name must be at least 2 characters')
    .max(100, 'Modifier group name must be less than 100 characters')
    .trim()
    .optional(),
  required: z.boolean().optional(),
  multiSelect: z.boolean().optional(),
  minSelect: z.number()
    .int('Minimum selection must be an integer')
    .min(0, 'Minimum selection cannot be negative')
    .max(50, 'Minimum selection cannot exceed 50')
    .optional(),
  maxSelect: z.number()
    .int('Maximum selection must be an integer')
    .min(1, 'Maximum selection must be at least 1')
    .max(50, 'Maximum selection cannot exceed 50')
    .optional(),
  displayOrder: z.number()
    .int('Display order must be an integer')
    .min(0, 'Display order cannot be negative')
    .max(9999, 'Display order cannot exceed 9999')
    .optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
}).refine(data => {
  if (data.maxSelect && data.minSelect && data.minSelect > data.maxSelect) {
    return false;
  }
  return true;
}, {
  message: 'Minimum selection cannot be greater than maximum selection',
  path: ['minSelect']
}).refine(data => {
  if (!data.multiSelect && data.maxSelect && data.maxSelect > 1) {
    return false;
  }
  return true;
}, {
  message: 'Single select groups cannot have maximum selection greater than 1',
  path: ['maxSelect']
});

// Modifier group query parameters
export const ModifierGroupQuerySchema = z.object({
  restaurantId: z.string()
    .uuid('Invalid restaurant ID')
    .optional(),
  menuItemId: z.string()
    .uuid('Invalid menu item ID')
    .optional(),
  isActive: z.boolean().optional(),
  search: z.string()
    .max(100, 'Search term too long')
    .trim()
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
  // Either restaurantId or menuItemId must be provided
  return data.restaurantId || data.menuItemId;
}, {
  message: 'Either restaurantId or menuItemId must be provided',
  path: ['restaurantId']
});

// Reorder modifier groups schema
export const ReorderModifierGroupsSchema = z.object({
  modifierGroupIds: z.array(z.string().uuid('Invalid modifier group ID'))
    .min(1, 'At least one modifier group ID is required')
    .max(50, 'Cannot reorder more than 50 modifier groups at once')
});

// Bulk update modifier groups schema
export const BulkUpdateModifierGroupsSchema = z.object({
  modifierGroupIds: z.array(z.string().uuid('Invalid modifier group ID'))
    .min(1, 'At least one modifier group ID is required')
    .max(20, 'Cannot update more than 20 modifier groups at once'),
  updates: z.object({
    required: z.boolean().optional(),
    multiSelect: z.boolean().optional(),
    isActive: z.boolean().optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field must be provided'
  })
});

// Modifier group params
export const ModifierGroupParamsSchema = z.object({
  id: z.string().uuid('Invalid modifier group ID')
});

// Legacy exports for backward compatibility
export const GetModifierGroupsQuerySchema = ModifierGroupQuerySchema;
export const ModifierGroupIdParamSchema = ModifierGroupParamsSchema;

// Type exports
export type CreateModifierGroupDTO = z.infer<typeof CreateModifierGroupSchema>;
export type UpdateModifierGroupDTO = z.infer<typeof UpdateModifierGroupSchema>;
export type ModifierGroupQueryDTO = z.infer<typeof ModifierGroupQuerySchema>;
export type ReorderModifierGroupsDTO = z.infer<typeof ReorderModifierGroupsSchema>;
export type BulkUpdateModifierGroupsDTO = z.infer<typeof BulkUpdateModifierGroupsSchema>;