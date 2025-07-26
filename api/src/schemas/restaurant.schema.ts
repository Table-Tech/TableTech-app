import { z } from 'zod';

// Create restaurant schema
export const CreateRestaurantSchema = z.object({
  name: z.string()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(120, 'Restaurant name must be less than 120 characters')
    .trim()
    .refine(val => val.length > 0, 'Restaurant name cannot be empty'),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phone: z.string()
    .regex(/^\+?[\d\s\-()]{8,20}$/, 'Invalid phone number format')
    .trim()
    .optional(),
  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .trim()
    .optional(),
  logoUrl: z.string()
    .url('Invalid logo URL')
    .max(500, 'Logo URL must be less than 500 characters')
    .optional()
}).refine(data => data.email || data.phone, {
  message: 'Either email or phone must be provided',
  path: ['email']
});

// Update restaurant schema
export const UpdateRestaurantSchema = z.object({
  name: z.string()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(120, 'Restaurant name must be less than 120 characters')
    .trim()
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  phone: z.string()
    .regex(/^\+?[\d\s\-()]{8,20}$/, 'Invalid phone number format')
    .trim()
    .optional(),
  address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .trim()
    .optional(),
  logoUrl: z.string()
    .url('Invalid logo URL')
    .max(500, 'Logo URL must be less than 500 characters')
    .optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Restaurant query parameters
export const RestaurantQuerySchema = z.object({
  search: z.string()
    .max(120, 'Search term too long')
    .trim()
    .optional(),
  limit: z.number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
  offset: z.number()
    .int('Offset must be an integer')
    .min(0, 'Offset cannot be negative')
    .default(0)
});

// Restaurant params
export const RestaurantParamsSchema = z.object({
  id: z.string().uuid('Invalid restaurant ID')
});

// Path param schema (legacy alias)
export const RestaurantIdParamSchema = RestaurantParamsSchema;

// Type exports
export type CreateRestaurantDTO = z.infer<typeof CreateRestaurantSchema>;
export type UpdateRestaurantDTO = z.infer<typeof UpdateRestaurantSchema>;
export type RestaurantQueryDTO = z.infer<typeof RestaurantQuerySchema>;