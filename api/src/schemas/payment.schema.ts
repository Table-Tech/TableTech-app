import { z } from 'zod';

// Payment creation schema
export const CreatePaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format'),
  amount: z.number().positive('Amount must be positive').max(99999, 'Amount too large'),
  description: z.string().optional(),
  customerEmail: z.string().email('Invalid email format').optional(),
  metadata: z.record(z.any()).optional()
});

// Payment status check schema
export const PaymentStatusSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required')
});

// Refund schema
export const CreateRefundSchema = z.object({
  paymentId: z.string().min(1, 'Payment ID is required'),
  amount: z.number().positive('Refund amount must be positive').optional(),
  description: z.string().max(255, 'Description too long').optional()
});

// Webhook payload schema
export const WebhookPayloadSchema = z.object({
  id: z.string().min(1, 'Payment ID is required')
});

// Export types
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;
export type PaymentStatusInput = z.infer<typeof PaymentStatusSchema>;
export type CreateRefundInput = z.infer<typeof CreateRefundSchema>;
export type WebhookPayloadInput = z.infer<typeof WebhookPayloadSchema>;