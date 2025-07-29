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
<<<<<<< HEAD
export function enforceOrderRules(orderData: CreateOrderDTO) {
  // Check if restaurant is open (simple time check) - TEMPORARILY DISABLED FOR TESTING
  // const hour = new Date().getHours();
  // if (hour < 8 || hour > 22) {
  //   throw new ApiError(400, 'RESTAURANT_CLOSED', 'Restaurant is closed');
  // }
=======
export function validateBusinessHours(): void {
  // Always allow orders for now - business hours will be implemented per restaurant later
  return;
}
>>>>>>> 70b1fd6b72e60ab5cf767959bd3236a0df8e8028

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
<<<<<<< HEAD
export async function convertOrderDTOToPrisma(
  orderData: CreateOrderDTO,
  staffId: string
): Promise<any> {
  return await prisma.$transaction(async (tx: any) => {
    // 1. Validate restaurant exists
    const restaurant = await tx.restaurant.findUnique({
      where: { id: orderData.restaurantId }
    });
    
    if (!restaurant) {
      throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
    }
=======
export function validateOrderAmount(amount: number): void {
  if (amount < ORDER_LIMITS.minAmount) {
    throw new ApiError(400, 'INVALID_TOTAL', `Order total must be at least €${ORDER_LIMITS.minAmount}`);
  }
>>>>>>> 70b1fd6b72e60ab5cf767959bd3236a0df8e8028

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

<<<<<<< HEAD
    // 3. Allow multiple orders per table - removed duplicate check
    // Tables can have multiple active orders from the same customer session

    // 4. Process order items and calculate total
    let totalAmount = 0;
    const processedOrderItems = [];

    for (const item of orderData.items) {
      // Validate quantity
      if (item.quantity < 1 || item.quantity > 10) {
        throw new ApiError(400, 'INVALID_QUANTITY', 'Item quantity must be between 1 and 10');
      }

      // Get menu item with validation
      const menuItem = await tx.menuItem.findFirst({
        where: { 
          id: item.menuId,
          restaurantId: orderData.restaurantId,
          isAvailable: true
        }
      });

      if (!menuItem) {
        throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', `Menu item not found or unavailable`);
      }

      const itemPrice = Number(menuItem.price);
      let modifierTotal = 0;
      const processedModifiers = [];

      // Process modifiers if provided
      if (item.modifiers && item.modifiers.length > 0) {
        const modifiers = await tx.modifier.findMany({
          where: { 
            id: { in: item.modifiers },
            modifierGroup: {
              menuItem: {
                restaurantId: orderData.restaurantId
              }
            }
          }
        });

        if (modifiers.length !== item.modifiers.length) {
          throw new ApiError(404, 'MODIFIER_NOT_FOUND', 'One or more modifiers not found');
        }

        // Calculate modifier total and prepare for creation
        for (const modifier of modifiers) {
          modifierTotal += Number(modifier.price);
          processedModifiers.push({
            modifier: { connect: { id: modifier.id } },
            price: Number(modifier.price)
          });
        }
      }

      const itemTotal = (itemPrice + modifierTotal) * item.quantity;
      totalAmount += itemTotal;

      processedOrderItems.push({
        quantity: item.quantity,
        price: itemPrice,
        notes: null,
        menuItem: { connect: { id: item.menuId } },
        modifiers: processedModifiers.length > 0 ? {
          create: processedModifiers
        } : undefined
      });
    }

    // 5. Validate order total
    if (totalAmount < 0.01) {
      throw new ApiError(400, 'INVALID_TOTAL', 'Order total must be greater than €0.01');
    }

    if (totalAmount > 10000) {
      throw new ApiError(400, 'TOTAL_TOO_HIGH', 'Order total cannot exceed €10,000');
    }

    // 6. Update table status to OCCUPIED if it was AVAILABLE
    if (table.status === 'AVAILABLE') {
      await tx.table.update({
        where: { id: orderData.tableId },
        data: { status: 'OCCUPIED' }
      });
    }

    // 7. Generate order number (simple example: timestamp + random 4 digits)
    const orderNumber = `${Date.now()}${Math.floor(1000 + Math.random() * 9000)}`;

    // 8. Return Prisma input format
    return {
      orderNumber,
      totalAmount,
      table: { connect: { id: orderData.tableId } },
      restaurant: { connect: { id: orderData.restaurantId } },
      orderItems: {
        create: processedOrderItems
      }
    };
  });
=======
  if (tableStatus === 'RESERVED') {
    throw new ApiError(400, 'TABLE_RESERVED', 'Table is reserved');
  }

  // Allow multiple orders per table - customers can order additional items
  // if (hasExistingOrders) {
  //   throw new ApiError(409, 'EXISTING_ORDER', 'Table already has an active order');
  // }
>>>>>>> 70b1fd6b72e60ab5cf767959bd3236a0df8e8028
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