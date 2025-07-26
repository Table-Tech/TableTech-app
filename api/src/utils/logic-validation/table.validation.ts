// utils/logic-validation/table.validation.ts
import { ApiError } from '../../types/errors.js';
import { TableStatus } from '@prisma/client';

/**
 * Validate table number is unique within restaurant
 */
export async function validateTableNumber(
  tx: any,
  tableNumber: number,
  restaurantId: string,
  excludeTableId?: string
) {
  const where: any = {
    restaurantId,
    number: tableNumber
  };

  if (excludeTableId) {
    where.id = { not: excludeTableId };
  }

  const existing = await tx.table.findFirst({ where });

  if (existing) {
    throw new ApiError(
      409,
      'TABLE_NUMBER_EXISTS',
      `Table number ${tableNumber} already exists in this restaurant`
    );
  }
}

/**
 * Validate table capacity
 */
export function validateTableCapacity(capacity?: number) {
  if (!capacity) return;

  if (capacity < 1 || capacity > 20) {
    throw new ApiError(
      400,
      'INVALID_CAPACITY',
      'Table capacity must be between 1 and 20'
    );
  }
}

/**
 * Validate table status transition
 */
export function validateTableStatusTransition(
  currentStatus: TableStatus,
  newStatus: TableStatus
) {
  // Define valid transitions
  const validTransitions: Record<TableStatus, TableStatus[]> = {
    AVAILABLE: ['OCCUPIED', 'RESERVED', 'MAINTENANCE'],
    OCCUPIED: ['AVAILABLE', 'MAINTENANCE'],
    RESERVED: ['OCCUPIED', 'AVAILABLE', 'MAINTENANCE'],
    MAINTENANCE: ['AVAILABLE']
  };

  const allowedStatuses = validTransitions[currentStatus];
  
  if (!allowedStatuses.includes(newStatus)) {
    throw new ApiError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${currentStatus} to ${newStatus}`
    );
  }
}

/**
 * Validate table code format
 */
export function validateTableCode(code: string) {
  // 6 character alphanumeric code
  const codeRegex = /^[A-Z0-9]{6}$/;
  
  if (!codeRegex.test(code)) {
    throw new ApiError(
      400,
      'INVALID_TABLE_CODE',
      'Table code must be 6 alphanumeric characters'
    );
  }
}

/**
 * Check if table can be modified
 */
export function canModifyTable(status: TableStatus) {
  if (status === 'OCCUPIED') {
    throw new ApiError(
      409,
      'TABLE_OCCUPIED',
      'Cannot modify occupied table'
    );
  }
}

/**
 * Validate bulk table creation
 */
export function validateBulkTables(tables: Array<{ number: number; capacity?: number }>) {
  if (tables.length > 50) {
    throw new ApiError(
      400,
      'TOO_MANY_TABLES',
      'Cannot create more than 50 tables at once'
    );
  }

  // Check for duplicate numbers in the batch
  const numbers = tables.map(t => t.number);
  const uniqueNumbers = new Set(numbers);
  
  if (numbers.length !== uniqueNumbers.size) {
    throw new ApiError(
      400,
      'DUPLICATE_TABLE_NUMBERS',
      'Duplicate table numbers in batch'
    );
  }

  // Validate each table
  tables.forEach(table => {
    if (table.number < 1 || table.number > 999) {
      throw new ApiError(
        400,
        'INVALID_TABLE_NUMBER',
        'Table number must be between 1 and 999'
      );
    }
    validateTableCapacity(table.capacity);
  });
}