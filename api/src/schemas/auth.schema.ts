import { z } from "zod";

// Password validation regex
const passwordRegex = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>]/
};

// Reusable password schema with strength validation
const StrongPasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password must be less than 100 characters")
  .refine(val => passwordRegex.uppercase.test(val), "Password must contain uppercase letter")
  .refine(val => passwordRegex.lowercase.test(val), "Password must contain lowercase letter")
  .refine(val => passwordRegex.number.test(val), "Password must contain number")
  .refine(val => passwordRegex.special.test(val), "Password must contain special character");

export const LoginSchema = z.object({
  email: z.string()
    .email("Invalid email format")
    .toLowerCase()
    .trim()
    .max(255),
  password: z.string()
    .min(1, "Password is required")
    .max(100), // Prevent DoS
  deviceName: z.string().optional() // Optional device name for session tracking
});

export const RegisterStaffSchema = z.object({
  name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100)
    .trim(),
  email: z.string()
    .email("Invalid email format")
    .toLowerCase()
    .trim()
    .max(255),
  password: StrongPasswordSchema,
  role: z.enum(["ADMIN", "MANAGER", "CHEF", "WAITER", "CASHIER"]),
  restaurantId: z.string().uuid("Invalid restaurant ID")
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: StrongPasswordSchema
}).refine(
  (data) => data.newPassword !== data.currentPassword,
  {
    message: "New password must be different from current password",
    path: ["newPassword"] // This will attach the error to newPassword field
  }
);

export const ForgotPasswordSchema = z.object({
  email: z.string()
    .email("Invalid email format")
    .toLowerCase()
    .trim()
    .max(255)
});

export const ResetPasswordSchema = z.object({
  token: z.string().uuid("Invalid reset token"),
  newPassword: StrongPasswordSchema
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});

// Type exports
export type LoginDTO = z.infer<typeof LoginSchema>;
export type RegisterStaffDTO = z.infer<typeof RegisterStaffSchema>;
export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;
export type ForgotPasswordDTO = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordDTO = z.infer<typeof ResetPasswordSchema>;
export type RefreshTokenDTO = z.infer<typeof RefreshTokenSchema>;
