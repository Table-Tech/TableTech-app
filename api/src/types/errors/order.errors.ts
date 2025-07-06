// src/types/order.errors.ts
import { BusinessLogicError } from "../errors.js";

export class OrderError extends BusinessLogicError {
  constructor(message: string, code: string, public orderId?: string) {
    super(message, code);
    this.name = 'OrderError';
  }
}

export class MenuItemNotAvailableError extends OrderError {
  constructor(menuItemId: string, menuItemName?: string) {
    super(
      `Menu item ${menuItemName || menuItemId} is not available`, 
      'MENU_ITEM_UNAVAILABLE',
      undefined
    );
    this.name = 'MenuItemNotAvailableError';
  }
}

export class ModifierNotAvailableError extends OrderError {
  constructor(modifierId: string, modifierName?: string) {
    super(
      `Modifier ${modifierName || modifierId} is not available`, 
      'MODIFIER_UNAVAILABLE',
      undefined
    );
    this.name = 'ModifierNotAvailableError';
  }
}

export class RestaurantClosedError extends OrderError {
  constructor(restaurantName?: string) {
    super(
      `Restaurant ${restaurantName || ''} is currently closed for orders`, 
      'RESTAURANT_CLOSED',
      undefined
    );
    this.name = 'RestaurantClosedError';
  }
}

export class TableUnavailableError extends OrderError {
  constructor(tableNumber?: number) {
    super(
      `Table ${tableNumber || ''} is not available for ordering`, 
      'TABLE_UNAVAILABLE',
      undefined
    );
    this.name = 'TableUnavailableError';
  }
}

export class OrderNotModifiableError extends OrderError {
  constructor(orderId: string, currentStatus: string) {
    super(
      `Order cannot be modified in ${currentStatus} status`, 
      'ORDER_NOT_MODIFIABLE',
      orderId
    );
    this.name = 'OrderNotModifiableError';
  }
}

export class InvalidOrderStatusTransitionError extends OrderError {
  constructor(orderId: string, fromStatus: string, toStatus: string) {
    super(
      `Cannot change order status from ${fromStatus} to ${toStatus}`, 
      'INVALID_STATUS_TRANSITION',
      orderId
    );
    this.name = 'InvalidOrderStatusTransitionError';
  }
}

export class OrderValueError extends OrderError {
  constructor(message: string, amount: number) {
    super(message, 'INVALID_ORDER_VALUE');
    this.name = 'OrderValueError';
  }
}

export class DuplicateOrderError extends OrderError {
  constructor(tableId: string) {
    super(
      `Table ${tableId} already has a pending order`, 
      'DUPLICATE_ORDER',
      undefined
    );
    this.name = 'DuplicateOrderError';
  }
}

export class OrderTimeoutError extends OrderError {
  constructor(orderId: string) {
    super(
      'Order session has expired. Please start a new order.', 
      'ORDER_TIMEOUT',
      orderId
    );
    this.name = 'OrderTimeoutError';
  }
}