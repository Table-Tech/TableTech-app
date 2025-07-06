// src/schemas/order.schema.ts
import { z } from "zod";
import { CommonSchemas, VALIDATION_RULES } from "../config/validation.js";

// Enhanced order schemas with comprehensive validation
export const CreateOrderSchema = z.object({
  tableId: CommonSchemas.uuid,
  restaurantId: CommonSchemas.uuid,
  notes: CommonSchemas.notes,
  orderItems: z.array(
    z.object({
      menuItemId: CommonSchemas.uuid,
      quantity: CommonSchemas.quantity,
      notes: z.string()
        .trim()
        .max(VALIDATION_RULES.NOTES.max, "Item notes too long")
        .optional(),
      modifiers: z.array(CommonSchemas.uuid)
        .max(VALIDATION_RULES.MODIFIERS_PER_ITEM, `Too many modifiers (max ${VALIDATION_RULES.MODIFIERS_PER_ITEM})`)
        .optional()
        .default([])
    })
  )
  .min(1, "Order must contain at least one item")
  .max(VALIDATION_RULES.ORDER_ITEMS_LIMIT, `Too many items (max ${VALIDATION_RULES.ORDER_ITEMS_LIMIT})`)
  .refine(
    (items) => {
      // Check for duplicate menu items with same modifiers
      const itemSignatures = items.map(item => 
        `${item.menuItemId}-${item.modifiers?.sort().join(',') || ''}`
      );
      return new Set(itemSignatures).size === itemSignatures.length;
    },
    { message: "Duplicate items detected. Please combine quantities instead." }
  )
}).strict(); // Reject any extra fields

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "COMPLETED", "CANCELLED"], {
    errorMap: () => ({ message: "Invalid order status" })
  }),
  estimatedTime: z.number()
    .int("Estimated time must be a whole number")
    .min(1, "Estimated time must be at least 1 minute")
    .max(300, "Estimated time cannot exceed 5 hours")
    .optional(),
  notes: z.string()
    .trim()
    .max(VALIDATION_RULES.NOTES.max, "Status notes too long")
    .optional()
}).strict();

export const GetOrdersQuerySchema = z.object({
  restaurantId: CommonSchemas.uuid.optional(),
  status: z.enum(["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED", "COMPLETED", "CANCELLED"]).optional(),
  tableId: CommonSchemas.uuid.optional(),
  from: z.string().datetime("Invalid date format").optional(),
  to: z.string().datetime("Invalid date format").optional(),
  limit: z.number()
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(50),
  offset: z.number()
    .int("Offset must be a whole number")
    .min(0, "Offset cannot be negative")
    .default(0)
}).refine(data => {
  // Business logic validation
  if (data.from && data.to) {
    return new Date(data.from) <= new Date(data.to);
  }
  return true;
}, {
  message: "From date must be before or equal to to date",
  path: ["from"]
});

export const OrderIdParamSchema = z.object({
  id: CommonSchemas.uuid
}).strict();

export const OrderStatisticsQuerySchema = z.object({
  days: z.number()
    .int("Days must be a whole number")
    .min(1, "Days must be at least 1")
    .max(365, "Days cannot exceed 365")
    .default(7)
});

export const RestaurantIdParamSchema = z.object({
  restaurantId: CommonSchemas.uuid
});