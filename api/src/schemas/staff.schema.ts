import { z } from "zod";

export const CreateStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"]),
  restaurantId: z.string().uuid(),
});

export const UpdateStaffSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"]).optional(),
  isActive: z.boolean().optional(),
});

export const StaffIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const GetStaffQuerySchema = z.object({
  restaurantId: z.string().uuid().optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});