import { ApiError } from '../../types/errors.js';
import { CreateOrderDTO, CreateCustomerOrderDTO } from '../../schemas/order.schema.js';

// Business hours configuration, later to be implemented in a config file
const BUSINESS_HOURS = {
  openTime: 8,  // 8 AM
  closeTime: 22, // 10 PM
  closedDays: [0] // Sunday
};

// Order limits
const ORDER_LIMITS = {
  minAmount: 0.01,
  maxAmount: 10000,
  maxItemsPerOrder: 50,
  maxQuantityPerItem: 10,
  customerMaxItems: 20
};

/**
 * Validate restaurant business hours
 * TODO: Replace with per-restaurant business hours from database
 */
export function validateBusinessHours(): void {
  // Always allow orders for now - business hours will be implemented per restaurant later
  return;
}

/**
 * Validate order items against business rules
 */
export function validateOrderItems(items: CreateOrderDTO['items'], isCustomer = false): void {
  if (items.length === 0) {
    throw new ApiError(400, 'EMPTY_ORDER', 'Order must contain at least one item');
  }

  const maxItems = isCustomer ? ORDER_LIMITS.customerMaxItems : ORDER_LIMITS.maxItemsPerOrder;
  if (items.length > maxItems) {
    throw new ApiError(400, 'TOO_MANY_ITEMS', `Maximum ${maxItems} items per order`);
  }

  // Check for duplicate items
  const itemCounts = new Map<string, number>();
  for (const item of items) {
    const count = itemCounts.get(item.menuId) || 0;
    itemCounts.set(item.menuId, count + item.quantity);

    if (itemCounts.get(item.menuId)! > ORDER_LIMITS.maxQuantityPerItem) {
      throw new ApiError(
        400,
        'QUANTITY_LIMIT_EXCEEDED',
        `Total quantity for an item cannot exceed ${ORDER_LIMITS.maxQuantityPerItem}`
      );
    }
  }
}

/**
 * Validate order total amount
 */
export function validateOrderAmount(amount: number): void {
  if (amount < ORDER_LIMITS.minAmount) {
    throw new ApiError(400, 'INVALID_TOTAL', `Order total must be at least €${ORDER_LIMITS.minAmount}`);
  }

  if (amount > ORDER_LIMITS.maxAmount) {
    throw new ApiError(400, 'TOTAL_TOO_HIGH', `Order total cannot exceed €${ORDER_LIMITS.maxAmount}`);
  }
}

/**
 * Validate table availability for new orders
 */
export function validateTableAvailability(
  tableStatus: string,
  hasExistingOrders: boolean
): void {
  if (tableStatus === 'MAINTENANCE') {
    throw new ApiError(400, 'TABLE_UNAVAILABLE', 'Table is under maintenance');
  }

  if (tableStatus === 'RESERVED') {
    throw new ApiError(400, 'TABLE_RESERVED', 'Table is reserved');
  }

  // Allow multiple orders per table - customers can order additional items
  // if (hasExistingOrders) {
  //   throw new ApiError(409, 'EXISTING_ORDER', 'Table already has an active order');
  // }
}

/**
 * Validate order status transitions
 */
export function validateStatusTransition(currentStatus: string, newStatus: string): void {
  const validTransitions: Record<string, string[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PREPARING', 'CANCELLED'],
    PREPARING: ['READY', 'CANCELLED'],
    READY: ['DELIVERED', 'CANCELLED'],
    DELIVERED: ['COMPLETED'],
    COMPLETED: [], // Final state
    CANCELLED: [] // Final state
  };

  if (!validTransitions[currentStatus]?.includes(newStatus)) {
    throw new ApiError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot change status from ${currentStatus} to ${newStatus}`
    );
  }
}

/**
 * Validate modifier groups requirements
 */
export function validateModifierGroups(
  selectedModifiers: string[],
  modifierGroups: Array<{
    id: string;
    name: string;
    required: boolean;
    minSelect: number;
    maxSelect: number | null;
    modifiers: Array<{ id: string }>;
  }>
): void {
  const selectedByGroup = new Map<string, number>();

  // Count selections per group
  for (const group of modifierGroups) {
    const count = group.modifiers.filter(m =>
      selectedModifiers.includes(m.id)
    ).length;
    selectedByGroup.set(group.id, count);

    // Validate required groups
    if (group.required && count === 0) {
      throw new ApiError(400, 'REQUIRED_MODIFIER', `${group.name} selection is required`);
    }

    // Validate min/max selection
    if (count < group.minSelect) {
      throw new ApiError(
        400,
        'MIN_MODIFIER_NOT_MET',
        `Select at least ${group.minSelect} option(s)`
      );
    }

    if (group.maxSelect && count > group.maxSelect) {
      throw new ApiError(
        400,
        'MAX_MODIFIER_EXCEEDED',
        `Select maximum ${group.maxSelect} option(s)`
      );
    }
  }
}

/**
 * Validate customer order specific rules
 */
export function validateCustomerOrder(orderData: CreateCustomerOrderDTO): void {
  // Validate business hours
  validateBusinessHours();

  // Validate items with customer limits
  validateOrderItems(orderData.items, true);

  // Additional customer-specific validations
  if (orderData.customerPhone && !isValidPhoneNumber(orderData.customerPhone)) {
    throw new ApiError(400, 'INVALID_PHONE', 'Invalid phone number format');
  }
}

/**
 * Check if user can modify order
 */
export function canModifyOrder(
  orderStatus: string,
  orderCreatedAt: Date,
  maxEditMinutes = 5
): boolean {
  // Can't modify final states
  if (['COMPLETED', 'CANCELLED', 'DELIVERED'].includes(orderStatus)) {
    return false;
  }

  // Can't modify old orders
  const minutesSinceCreation = (Date.now() - orderCreatedAt.getTime()) / 1000 / 60;
  return minutesSinceCreation <= maxEditMinutes;
}

// Helper functions
function isValidPhoneNumber(phone: string): boolean {
  // Basic phone validation - adjust based on your region
  const phoneRegex = /^\+?[\d\s-()]{10,}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Get order expiry time based on status
 */
export function getOrderExpiryMinutes(status: string): number {
  const expiryMap: Record<string, number> = {
    PENDING: 15,      // 15 minutes to confirm
    CONFIRMED: 60,    // 1 hour to prepare
    PREPARING: 120,   // 2 hours to ready
    READY: 30,        // 30 minutes to deliver
    DELIVERED: 60     // 1 hour to complete
  };

  return expiryMap[status] || 60;
}