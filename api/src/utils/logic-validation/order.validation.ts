import { z } from 'zod';
import { ApiError } from '../../types/errors.js';
import { CreateOrderSchema } from '../../schemas/order.schema.js';
import { prisma } from '../prisma.js';
import { Prisma } from '@prisma/client';

// Infer type locally
type CreateOrderDTO = z.infer<typeof CreateOrderSchema>;

/**
 * Business logic validation for orders
 */
export function enforceOrderRules(orderData: CreateOrderDTO) {
  // Check if restaurant is open (simple time check) - TEMPORARILY DISABLED FOR TESTING
  // const hour = new Date().getHours();
  // if (hour < 8 || hour > 22) {
  //   throw new ApiError(400, 'RESTAURANT_CLOSED', 'Restaurant is closed');
  // }

  // Check minimum order value
  if (orderData.items.length === 0) {
    throw new ApiError(400, 'EMPTY_ORDER', 'Order must contain at least one item');
  }

  // Check maximum items per order
  if (orderData.items.length > 50) {
    throw new ApiError(400, 'TOO_MANY_ITEMS', 'Maximum 50 items per order');
  }

  // Check item quantities
  for (const item of orderData.items) {
    if (item.quantity > 10) {
      throw new ApiError(400, 'QUANTITY_LIMIT', 'Maximum 10 quantity per item');
    }
  }
}

/**
 * Convert CreateOrderDTO to Prisma OrderCreateInput with business logic
 */
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

    // 2. Validate table exists and is available
    const table = await tx.table.findFirst({
      where: { 
        id: orderData.tableId, 
        restaurantId: orderData.restaurantId 
      }
    });
    
    if (!table) {
      throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
    }

    if (table.status !== 'AVAILABLE' && table.status !== 'OCCUPIED') {
      throw new ApiError(400, 'TABLE_UNAVAILABLE', `Table is ${table.status.toLowerCase()}`);
    }

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