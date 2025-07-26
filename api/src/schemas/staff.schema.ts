import { z } from 'zod';

// Strong password schema (reuse from auth)
const StrongPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .refine(val => /[A-Z]/.test(val), 'Password must contain uppercase letter')
  .refine(val => /[a-z]/.test(val), 'Password must contain lowercase letter')
  .refine(val => /[0-9]/.test(val), 'Password must contain number')
  .refine(val => /[!@#$%^&*(),.?":{}|<>]/.test(val), 'Password must contain special character');

// Create staff
export const CreateStaffSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters'),
  password: StrongPasswordSchema,
  role: z.enum(['ADMIN', 'MANAGER', 'CHEF', 'WAITER', 'CASHIER']),
  restaurantId: z.string().uuid('Invalid restaurant ID')
});

// Update staff
export const UpdateStaffSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim()
    .max(255, 'Email must be less than 255 characters')
    .optional(),
  password: StrongPasswordSchema.optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'CHEF', 'WAITER', 'CASHIER']).optional(),
  isActive: z.boolean().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update'
});

// Change password (for self-service)
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: StrongPasswordSchema
}).refine(
  (data) => data.newPassword !== data.currentPassword,
  {
    message: 'New password must be different from current password',
    path: ['newPassword']
  }
);

// Staff query parameters
export const StaffQuerySchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'CHEF', 'WAITER', 'CASHIER']).optional(),
  isActive: z.boolean().optional(),
  search: z.string()
    .max(100, 'Search term too long')
    .trim()
    .optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0)
});

// Staff params
export const StaffParamsSchema = z.object({
  id: z.string().uuid('Invalid staff ID')
});

// Bulk update staff
export const BulkUpdateStaffSchema = z.object({
  staffIds: z.array(z.string().uuid('Invalid staff ID'))
    .min(1, 'At least one staff ID is required')
    .max(20, 'Cannot update more than 20 staff members at once'),
  updates: z.object({
    isActive: z.boolean().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'CHEF', 'WAITER', 'CASHIER']).optional()
  }).refine(data => Object.keys(data).length > 0, {
    message: 'At least one update field must be provided'
  })
});

// Type exports
export type CreateStaffDTO = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffDTO = z.infer<typeof UpdateStaffSchema>;
export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;
export type StaffQueryDTO = z.infer<typeof StaffQuerySchema>;
export type BulkUpdateStaffDTO = z.infer<typeof BulkUpdateStaffSchema>;

// Legacy exports for backward compatibility
export const StaffIdParamSchema = z.object({
  id: z.string().uuid('Invalid staff ID')
});

export const GetStaffQuerySchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID').optional()
});