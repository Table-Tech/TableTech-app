import { ApiError } from '../../types/errors.js';
import { CreateMenuItemDTO, UpdateMenuItemDTO } from '../../schemas/menu.schema.js';

// Menu item limits and constraints
const MENU_LIMITS = {
  maxItemsPerCategory: 100,
  maxPriceValue: 9999.99,
  minPriceValue: 0.01,
  maxNameLength: 100,
  maxDescriptionLength: 500,
  maxImageUrlLength: 500,
  maxPreparationTime: 180, // 3 hours in minutes
  minPreparationTime: 1
};

// Price validation constants
const PRICE_PRECISION = 2; // Max 2 decimal places

/**
 * Validate menu item name uniqueness within category
 */
export function validateUniqueNameInCategory(
  name: string,
  categoryId: string,
  existingItems: Array<{ name: string; id: string }>,
  excludeId?: string
): void {
  const duplicateItem = existingItems.find(item => 
    item.name.toLowerCase() === name.toLowerCase() && 
    item.id !== excludeId
  );

  if (duplicateItem) {
    throw new ApiError(
      409, 
      'DUPLICATE_MENU_ITEM', 
      `Menu item with name "${name}" already exists in this category`
    );
  }
}

/**
 * Validate price format and constraints
 */
export function validateMenuItemPrice(price: number): void {
  if (price < MENU_LIMITS.minPriceValue) {
    throw new ApiError(
      400, 
      'PRICE_TOO_LOW', 
      `Price must be at least €${MENU_LIMITS.minPriceValue}`
    );
  }

  if (price > MENU_LIMITS.maxPriceValue) {
    throw new ApiError(
      400, 
      'PRICE_TOO_HIGH', 
      `Price cannot exceed €${MENU_LIMITS.maxPriceValue}`
    );
  }

  // Check decimal places
  const decimalPlaces = (price.toString().split('.')[1] || '').length;
  if (decimalPlaces > PRICE_PRECISION) {
    throw new ApiError(
      400, 
      'INVALID_PRICE_PRECISION', 
      `Price can have at most ${PRICE_PRECISION} decimal places`
    );
  }
}

/**
 * Validate preparation time constraints
 */
export function validatePreparationTime(preparationTime?: number): void {
  if (preparationTime === undefined) return;

  if (preparationTime < MENU_LIMITS.minPreparationTime) {
    throw new ApiError(
      400, 
      'PREPARATION_TIME_TOO_LOW', 
      `Preparation time must be at least ${MENU_LIMITS.minPreparationTime} minute`
    );
  }

  if (preparationTime > MENU_LIMITS.maxPreparationTime) {
    throw new ApiError(
      400, 
      'PREPARATION_TIME_TOO_HIGH', 
      `Preparation time cannot exceed ${MENU_LIMITS.maxPreparationTime} minutes`
    );
  }

  if (!Number.isInteger(preparationTime)) {
    throw new ApiError(
      400, 
      'INVALID_PREPARATION_TIME', 
      'Preparation time must be a whole number of minutes'
    );
  }
}

/**
 * Validate image URL format and accessibility
 */
export function validateImageUrl(imageUrl?: string): void {
  if (!imageUrl) return;

  if (imageUrl.length > MENU_LIMITS.maxImageUrlLength) {
    throw new ApiError(
      400, 
      'IMAGE_URL_TOO_LONG', 
      `Image URL cannot exceed ${MENU_LIMITS.maxImageUrlLength} characters`
    );
  }

  // Basic URL validation (more comprehensive validation in schema)
  try {
    const url = new URL(imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ApiError(400, 'INVALID_IMAGE_URL', 'Image URL must use HTTP or HTTPS protocol');
    }
  } catch {
    throw new ApiError(400, 'INVALID_IMAGE_URL', 'Invalid image URL format');
  }

  // Check for common image extensions (optional validation)
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
  const hasValidExtension = validExtensions.some(ext => 
    imageUrl.toLowerCase().includes(ext)
  );
  
  if (!hasValidExtension) {
    console.warn(`Image URL may not be a valid image format: ${imageUrl}`);
  }
}

/**
 * Validate category item count limits
 */
export function validateCategoryItemLimit(
  categoryId: string,
  currentItemCount: number,
  isAddingNew: boolean = false
): void {
  const newCount = isAddingNew ? currentItemCount + 1 : currentItemCount;
  
  if (newCount > MENU_LIMITS.maxItemsPerCategory) {
    throw new ApiError(
      400, 
      'CATEGORY_ITEM_LIMIT', 
      `Category cannot have more than ${MENU_LIMITS.maxItemsPerCategory} items`
    );
  }
}

/**
 * Validate display order constraints
 */
export function validateDisplayOrder(
  displayOrder: number,
  existingOrders: number[] = []
): void {
  if (displayOrder < 0) {
    throw new ApiError(400, 'INVALID_DISPLAY_ORDER', 'Display order must be non-negative');
  }

  if (!Number.isInteger(displayOrder)) {
    throw new ApiError(400, 'INVALID_DISPLAY_ORDER', 'Display order must be a whole number');
  }

  // Optional: Check for reasonable upper limit
  if (displayOrder > 9999) {
    throw new ApiError(400, 'DISPLAY_ORDER_TOO_HIGH', 'Display order cannot exceed 9999');
  }
}

/**
 * Validate menu item business rules
 */
export function validateMenuItemBusinessRules(
  data: CreateMenuItemDTO | UpdateMenuItemDTO,
  existingItemsInCategory: Array<{ name: string; id: string }> = [],
  excludeId?: string
): void {
  // Validate price if provided
  if ('price' in data && data.price !== undefined) {
    validateMenuItemPrice(data.price);
  }

  // Validate preparation time
  validatePreparationTime(data.preparationTime);

  // Validate image URL
  validateImageUrl(data.imageUrl);

  // Validate name uniqueness
  if (data.name) {
    validateUniqueNameInCategory(
      data.name, 
      ('categoryId' in data ? data.categoryId : '') || '', 
      existingItemsInCategory,
      excludeId
    );
  }

  // Validate display order
  if (data.displayOrder !== undefined) {
    validateDisplayOrder(data.displayOrder);
  }
}

/**
 * Validate menu availability constraints
 */
export function validateMenuAvailability(
  isAvailable: boolean,
  hasActiveOrders: boolean = false
): void {
  // Warn if disabling item with active orders
  if (!isAvailable && hasActiveOrders) {
    console.warn('Disabling menu item that has active orders - this may affect customer experience');
  }
  
  // Could add more business rules here, like:
  // - Minimum availability duration
  // - Restaurant operating hours validation
  // - Inventory checks
}

/**
 * Validate bulk operation constraints
 */
export function validateBulkOperation(
  itemIds: string[],
  maxBulkSize: number = 50
): void {
  if (itemIds.length === 0) {
    throw new ApiError(400, 'EMPTY_BULK_OPERATION', 'At least one item ID is required');
  }

  if (itemIds.length > maxBulkSize) {
    throw new ApiError(
      400, 
      'BULK_OPERATION_TOO_LARGE', 
      `Cannot process more than ${maxBulkSize} items at once`
    );
  }

  // Check for duplicate IDs
  const uniqueIds = new Set(itemIds);
  if (uniqueIds.size !== itemIds.length) {
    throw new ApiError(400, 'DUPLICATE_ITEM_IDS', 'Duplicate item IDs found in bulk operation');
  }
}

/**
 * Validate reorder operation constraints
 */
export function validateReorderOperation(
  itemOrders: Array<{ itemId: string; displayOrder: number }>,
  maxReorderSize: number = 100
): void {
  if (itemOrders.length === 0) {
    throw new ApiError(400, 'EMPTY_REORDER_OPERATION', 'At least one item order is required');
  }

  if (itemOrders.length > maxReorderSize) {
    throw new ApiError(
      400, 
      'REORDER_OPERATION_TOO_LARGE', 
      `Cannot reorder more than ${maxReorderSize} items at once`
    );
  }

  // Check for duplicate item IDs
  const itemIds = itemOrders.map(order => order.itemId);
  const uniqueIds = new Set(itemIds);
  if (uniqueIds.size !== itemIds.length) {
    throw new ApiError(400, 'DUPLICATE_ITEM_IDS', 'Duplicate item IDs found in reorder operation');
  }

  // Validate all display orders
  for (const order of itemOrders) {
    validateDisplayOrder(order.displayOrder);
  }

  // Check for duplicate display orders
  const displayOrders = itemOrders.map(order => order.displayOrder);
  const uniqueOrders = new Set(displayOrders);
  if (uniqueOrders.size !== displayOrders.length) {
    console.warn('Duplicate display orders found - items may have conflicting positions');
  }
}

/**
 * Check if menu item can be safely deleted
 */
export function canDeleteMenuItem(
  hasOrderHistory: boolean,
  hasActiveOrders: boolean = false
): { canDelete: boolean; reason?: string } {
  if (hasActiveOrders) {
    return {
      canDelete: false,
      reason: 'Cannot delete menu item with active orders'
    };
  }

  if (hasOrderHistory) {
    return {
      canDelete: false,
      reason: 'Menu item has order history - will be marked as unavailable instead'
    };
  }

  return { canDelete: true };
}

/**
 * Format price for consistent display
 */
export function formatMenuPrice(price: number): string {
  return `€${price.toFixed(2)}`;
}

/**
 * Calculate menu statistics helper
 */
export function calculateMenuHealth(
  totalItems: number,
  availableItems: number,
  averagePrice: number
): {
  availabilityRate: number;
  healthStatus: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
} {
  const availabilityRate = totalItems > 0 ? (availableItems / totalItems) * 100 : 0;
  const recommendations: string[] = [];
  
  let healthStatus: 'excellent' | 'good' | 'fair' | 'poor';

  if (availabilityRate >= 95) {
    healthStatus = 'excellent';
  } else if (availabilityRate >= 80) {
    healthStatus = 'good';
  } else if (availabilityRate >= 60) {
    healthStatus = 'fair';
    recommendations.push('Consider reviewing unavailable items');
  } else {
    healthStatus = 'poor';
    recommendations.push('Many items are unavailable - review menu availability');
  }

  if (totalItems < 5) {
    recommendations.push('Consider adding more menu items for better variety');
  }

  if (averagePrice < 5) {
    recommendations.push('Review pricing strategy - average price seems low');
  } else if (averagePrice > 50) {
    recommendations.push('High average price - ensure value proposition is clear');
  }

  return {
    availabilityRate: Math.round(availabilityRate),
    healthStatus,
    recommendations
  };
}