// src/utils/order.validation.ts
import { z } from "zod";
import { CommonSchemas, VALIDATION_RULES } from "../../config/validation.js";
import { BusinessLogicError } from "../../types/errors.js";

// Order-specific validation rules (extending global config)
export const ORDER_VALIDATION_RULES = {
  ...VALIDATION_RULES,
  MIN_ORDER_VALUE: 1.00,
  MAX_ORDER_VALUE: 5000.00,
  ORDER_TIMEOUT_MINUTES: 30,
} as const;

// Enhanced order validation schemas
export const CreateOrderSchema = z.object({
  tableId: CommonSchemas.uuid,
  restaurantId: CommonSchemas.uuid,
  notes: z.string()
    .trim()
    .max(VALIDATION_RULES.NOTES.max, "Order notes too long")
    .optional(),
  orderItems: z.array(
    z.object({
      menuItemId: CommonSchemas.uuid,
      quantity: z.number()
        .int("Quantity must be a whole number")
        .min(VALIDATION_RULES.QUANTITY.min, "Quantity must be at least 1")
        .max(VALIDATION_RULES.QUANTITY.max, "Quantity too high"),
      notes: z.string()
        .trim()
        .max(VALIDATION_RULES.NOTES.max, "Item notes too long")
        .optional(),
      modifiers: z.array(CommonSchemas.uuid)
        .max(VALIDATION_RULES.MODIFIERS_PER_ITEM, "Too many modifiers per item")
        .optional()
        .default([])
    })
  )
  .min(1, "Order must contain at least one item")
  .max(VALIDATION_RULES.ORDER_ITEMS_LIMIT, "Too many items in order")
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
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED'], {
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
});

export const GetOrdersQuerySchema = z.object({
  restaurantId: CommonSchemas.uuid.optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED']).optional(),
  tableId: CommonSchemas.uuid.optional(),
  from: z.string()
    .datetime("Invalid date format for 'from' parameter")
    .optional(),
  to: z.string()
    .datetime("Invalid date format for 'to' parameter") 
    .optional(),
  limit: z.number()
    .int("Limit must be a whole number")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit cannot exceed 100")
    .default(20),
  offset: z.number()
    .int("Offset must be a whole number")
    .min(0, "Offset cannot be negative")
    .default(0)
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to);
    }
    return true;
  },
  { message: "'from' date must be before 'to' date" }
);

export const OrderIdParamSchema = z.object({
  id: CommonSchemas.uuid
});

// Business validation functions
export class OrderValidation {
  static validateOrderTiming(restaurantId: string): void {
    // TODO: Implement restaurant hours check
    // For now, assume always open
    const currentHour = new Date().getHours();
    if (currentHour < 6 || currentHour > 23) {
      throw new BusinessLogicError(
        "Orders are not accepted during these hours", 
        "OUTSIDE_BUSINESS_HOURS"
      );
    }
  }

  static validateOrderValue(totalAmount: number): void {
    if (totalAmount < ORDER_VALIDATION_RULES.MIN_ORDER_VALUE) {
      throw new BusinessLogicError(
        `Order total must be at least €${ORDER_VALIDATION_RULES.MIN_ORDER_VALUE}`,
        "ORDER_VALUE_TOO_LOW"
      );
    }

    if (totalAmount > ORDER_VALIDATION_RULES.MAX_ORDER_VALUE) {
      throw new BusinessLogicError(
        `Order total cannot exceed €${ORDER_VALIDATION_RULES.MAX_ORDER_VALUE}`,
        "ORDER_VALUE_TOO_HIGH"
      );
    }
  }

  static validateTableAvailability(tableStatus: string): void {
    if (tableStatus !== 'AVAILABLE' && tableStatus !== 'OCCUPIED') {
      throw new BusinessLogicError(
        "Table is not available for ordering",
        "TABLE_UNAVAILABLE"
      );
    }
  }

  static validateOrderStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'PENDING': ['CONFIRMED', 'CANCELLED'],
      'CONFIRMED': ['PREPARING', 'CANCELLED'],
      'PREPARING': ['READY', 'CANCELLED'],
      'READY': ['DELIVERED'],
      'DELIVERED': ['COMPLETED'],
      'COMPLETED': [],
      'CANCELLED': []
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    
    if (!allowedStatuses.includes(newStatus)) {
      throw new BusinessLogicError(
        `Cannot change status from ${currentStatus} to ${newStatus}`,
        "INVALID_STATUS_TRANSITION"
      );
    }
  }
}