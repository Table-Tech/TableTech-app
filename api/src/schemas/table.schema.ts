import { z } from 'zod';

// Create table
export const CreateTableSchema = z.object({
  number: z.number()
    .int('Table number must be whole number')
    .min(1, 'Table number must be at least 1')
    .max(999, 'Table number must be less than 1000'),
  capacity: z.number()
    .int('Capacity must be whole number')
    .min(1, 'Capacity must be at least 1')
    .max(20, 'Capacity must be less than 20')
    .optional()
    .default(4),
  restaurantId: z.string().uuid('Invalid restaurant ID')
});

// Bulk create tables
export const BulkCreateTablesSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  tables: z.array(z.object({
    number: z.number()
      .int('Table number must be whole number')
      .min(1, 'Table number must be at least 1')
      .max(999, 'Table number must be less than 1000'),
    capacity: z.number()
      .int('Capacity must be whole number')
      .min(1, 'Capacity must be at least 1')
      .max(20, 'Capacity must be less than 20')
      .optional()
  }))
  .min(1, 'Must create at least one table')
  .max(50, 'Cannot create more than 50 tables at once')
});

// Update table
export const UpdateTableSchema = z.object({
  number: z.number()
    .int('Table number must be whole number')
    .min(1, 'Table number must be at least 1')
    .max(999, 'Table number must be less than 1000')
    .optional(),
  capacity: z.number()
    .int('Capacity must be whole number')
    .min(1, 'Capacity must be at least 1')
    .max(20, 'Capacity must be less than 20')
    .optional()
}).refine(data => data.number || data.capacity, {
  message: 'At least one field must be provided'
});

// Update table status
export const UpdateTableStatusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'])
});

// Query tables
export const TableQuerySchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE']).optional(),
  available: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

// Table params
export const TableParamsSchema = z.object({
  id: z.string().uuid('Invalid table ID')
});

export const TableCodeParamsSchema = z.object({
  code: z.string().regex(/^[A-Z0-9]{6}$/, 'Invalid table code format')
});

// Customer table validation
export const ValidateTableSchema = z.object({
  code: z.string()
    .min(1, 'Table code is required')
    .max(10, 'Table code too long')
    .transform(val => val.toUpperCase())
});

// Type exports
export type CreateTableDTO = z.infer<typeof CreateTableSchema>;
export type BulkCreateTablesDTO = z.infer<typeof BulkCreateTablesSchema>;
export type UpdateTableDTO = z.infer<typeof UpdateTableSchema>;
export type UpdateTableStatusDTO = z.infer<typeof UpdateTableStatusSchema>;
export type TableQueryDTO = z.infer<typeof TableQuerySchema>;
export type ValidateTableDTO = z.infer<typeof ValidateTableSchema>;