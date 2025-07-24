import { z } from 'zod';

// Reusable schemas
const OrderItemSchema = z.object({
  menuId: z.string().uuid("Invalid menu item ID"),
  quantity: z.number()
    .int("Quantity must be whole number")
    .min(1, "Minimum quantity is 1")
    .max(10, "Maximum quantity is 10 per item"),
  modifiers: z.array(z.string().uuid()).optional(),
  notes: z.string().max(200, "Notes too long").optional()
});

// Staff order creation
export const CreateOrderSchema = z.object({
  tableId: z.string().uuid("Invalid table ID"),
  restaurantId: z.string().uuid("Invalid restaurant ID"),
  items: z.array(OrderItemSchema)
    .min(1, "Order must have at least one item")
    .max(50, "Maximum 50 items per order"),
  notes: z.string().max(500, "Notes too long").optional()
});

// Customer order creation (via QR code)
export const CreateCustomerOrderSchema = z.object({
  tableCode: z.string().min(1).max(10),
  items: z.array(OrderItemSchema)
    .min(1, "Order must have at least one item")
    .max(20, "Maximum 20 items per order"), // Lower limit for customers
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().regex(/^\+?[\d\s-()]+$/).optional(),
  notes: z.string().max(200).optional()
});

// Order status update
export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING", "CONFIRMED", "PREPARING", 
    "READY", "DELIVERED", "COMPLETED", "CANCELLED"
  ]),
  notes: z.string().max(500).optional()
});

// Order item status update (for kitchen)
export const UpdateOrderItemStatusSchema = z.object({
  itemId: z.string().uuid(),
  status: z.enum(["PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"])
});

// Query schemas
export const OrderQuerySchema = z.object({
  status: z.enum([
    "PENDING", "CONFIRMED", "PREPARING", 
    "READY", "DELIVERED", "COMPLETED", "CANCELLED"
  ]).optional(),
  tableId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

// Params schemas
export const OrderParamsSchema = z.object({
  id: z.string().uuid("Invalid order ID")
});

export const OrderItemParamsSchema = z.object({
  orderId: z.string().uuid(),
  itemId: z.string().uuid()
});

// Customer validation schema
export const CustomerAuthSchema = z.object({
  tableCode: z.string().min(1),
  restaurantId: z.string().uuid()
});

// Type exports
export type CreateOrderDTO = z.infer<typeof CreateOrderSchema>;
export type CreateCustomerOrderDTO = z.infer<typeof CreateCustomerOrderSchema>;
export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusSchema>;
export type UpdateOrderItemStatusDTO = z.infer<typeof UpdateOrderItemStatusSchema>;
export type OrderQueryDTO = z.infer<typeof OrderQuerySchema>;
export type CustomerAuthDTO = z.infer<typeof CustomerAuthSchema>;