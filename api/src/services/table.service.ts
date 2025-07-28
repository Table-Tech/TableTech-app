import { Table, Prisma, TableStatus } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import { 
  CreateTableDTO, 
  UpdateTableDTO,
  BulkCreateTablesDTO,
  TableQueryDTO,
  UpdateTableStatusDTO
} from '../schemas/table.schema.js';
import {
  validateTableNumber,
  validateTableCapacity,
  validateTableStatusTransition,
  validateTableCode,
  canModifyTable
} from '../utils/logic-validation/table.validation.js';
import crypto from 'crypto';
import { 
  generateUniqueTableCode, 
  generatePermanentQRCodeURL,
  isValidTableCode,
  regenerateTableCodeAndQR
} from '../utils/qr-code.js';

export class TableService extends BaseService<Prisma.TableCreateInput, Table> {
  protected model = 'table' as const;

  /**
   * Create single table
   */
  async createTable(data: CreateTableDTO, staffId: string): Promise<Table> {
    // Validate inputs
    validateTableCapacity(data.capacity);
    
    return await this.prisma.$transaction(async (tx) => {
      // Check restaurant exists and user has access
      const restaurant = await tx.restaurant.findUnique({
        where: { id: data.restaurantId }
      });

      if (!restaurant) {
        throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
      }

      // Validate table number is unique for restaurant
      await validateTableNumber(tx, data.number, data.restaurantId);

      // Generate permanent, unique table code (NEVER changes once created)
      const code = await this.generatePermanentUniqueTableCode(tx);
      
      // Generate permanent QR code URL (safe for printing/carving)
      const qrCodeUrl = generatePermanentQRCodeURL(code);

      // Create table with permanent QR code
      const table = await tx.table.create({
        data: {
          number: data.number,
          code,
          capacity: data.capacity || 4,
          status: 'AVAILABLE',
          restaurant: { connect: { id: data.restaurantId } },
          qrCodeUrl // Permanent QR code URL
        },
        include: this.getTableIncludes()
      });

      // Log table creation for audit trail
      console.log('✅ Table created with permanent QR code:', {
        tableId: table.id,
        tableNumber: table.number,
        code: table.code,
        restaurantId: data.restaurantId,
        timestamp: new Date().toISOString()
      });

      return table;
    });
  }

  /**
   * Bulk create tables
   */
  async bulkCreateTables(data: BulkCreateTablesDTO, staffId: string): Promise<Table[]> {
    const { restaurantId, tables } = data;
    
    return await this.prisma.$transaction(async (tx) => {
      // Validate restaurant
      const restaurant = await tx.restaurant.findUnique({
        where: { id: restaurantId }
      });

      if (!restaurant) {
        throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
      }

      // Validate all table numbers are unique
      const tableNumbers = tables.map(t => t.number);
      const existingTables = await tx.table.findMany({
        where: {
          restaurantId,
          number: { in: tableNumbers }
        },
        select: { number: true }
      });

      if (existingTables.length > 0) {
        const existingNumbers = existingTables.map(t => t.number);
        throw new ApiError(
          409,
          'TABLE_NUMBER_EXISTS',
          `Table numbers already exist: ${existingNumbers.join(', ')}`
        );
      }

      // Create all tables with permanent QR codes
      const createdTables = [];
      for (const tableData of tables) {
        validateTableCapacity(tableData.capacity);
        
        // Generate permanent, unique table code
        const code = await this.generatePermanentUniqueTableCode(tx);
        
        // Generate permanent QR code URL
        const qrCodeUrl = generatePermanentQRCodeURL(code);
        
        const table = await tx.table.create({
          data: {
            number: tableData.number,
            code,
            capacity: tableData.capacity || 4,
            status: 'AVAILABLE',
            restaurant: { connect: { id: restaurantId } },
            qrCodeUrl // Permanent QR code URL
          },
          include: this.getTableIncludes()
        });
        
        createdTables.push(table);
      }

      // Log bulk creation for audit trail
      console.log('✅ Bulk tables created with permanent QR codes:', {
        restaurantId,
        tableCount: createdTables.length,
        tableNumbers: createdTables.map(t => t.number),
        timestamp: new Date().toISOString()
      });

      return createdTables;
    });
  }

  /**
   * Update table
   */
  async updateTable(
    tableId: string,
    data: UpdateTableDTO,
    staffId: string
  ): Promise<Table> {
    return await this.prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({
        where: { id: tableId },
        include: { restaurant: true }
      });

      if (!table) {
        throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
      }

      canModifyTable(table.status);

      // Validate updates
      if (data.capacity) validateTableCapacity(data.capacity);
      if (data.number && data.number !== table.number) {
        await validateTableNumber(tx, data.number, table.restaurantId);
      }

      // IMPORTANT: Never update QR code fields in regular updates
      // QR codes must remain permanent for printed materials
      const updated = await tx.table.update({
        where: { id: tableId },
        data: {
          ...(data.number && { number: data.number }),
          ...(data.capacity && { capacity: data.capacity })
          // Note: code and qrCodeUrl are intentionally excluded to maintain permanence
        },
        include: this.getTableIncludes()
      });

      // Log update for audit trail
      console.log('✅ Table updated (QR code preserved):', {
        tableId,
        changes: data,
        timestamp: new Date().toISOString()
      });

      return updated;
    });
  }

  /**
   * Update table status
   */
  async updateTableStatus(
    tableId: string,
    data: UpdateTableStatusDTO,
    staffId?: string
  ): Promise<Table> {
    return await this.prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({
        where: { id: tableId }
      });

      if (!table) {
        throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
      }

      // Validate status transition
      validateTableStatusTransition(table.status, data.status);

      // Check for active orders when setting to maintenance
      if (data.status === 'MAINTENANCE') {
        const activeOrders = await tx.order.count({
          where: {
            tableId,
            status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
          }
        });

        if (activeOrders > 0) {
          throw new ApiError(
            409,
            'TABLE_HAS_ACTIVE_ORDERS',
            'Cannot set table to maintenance with active orders'
          );
        }
      }

      const updated = await tx.table.update({
        where: { id: tableId },
        data: { status: data.status },
        include: this.getTableIncludes()
      });

      // TODO: Emit WebSocket event for status change

      return updated;
    });
  }

  /**
   * Get tables with filters
   */
  async getTables(restaurantId: string, query: TableQueryDTO) {
    const where: Prisma.TableWhereInput = { restaurantId };

    if (query.status) where.status = query.status;
    if (query.available !== undefined) {
      where.status = query.available ? 'AVAILABLE' : { not: 'AVAILABLE' };
    }

    const [tables, total] = await Promise.all([
      this.prisma.table.findMany({
        where,
        include: {
          ...this.getTableIncludes(),
          _count: {
            select: {
              orders: {
                where: {
                  status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
                }
              }
            }
          }
        },
        orderBy: { number: 'asc' },
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.table.count({ where })
    ]);

    return {
      tables,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit)
      }
    };
  }

  /**
   * Get table by code (for customer access)
   */
  async getTableByCode(code: string) {
    const table = await this.prisma.table.findUnique({
      where: { code },
      include: {
        restaurant: {
          select: { 
            id: true, 
            name: true, 
            logoUrl: true
          }
        }
      }
    });

    if (!table) {
      throw new ApiError(404, 'INVALID_TABLE_CODE', 'Invalid table code');
    }

    // Restaurant is always active in current schema
    // TODO: Add isActive field to Restaurant model if needed

    return table;
  }

  /**
   * Delete table
   */
  async deleteTable(tableId: string, staffId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({
        where: { id: tableId }
      });

      if (!table) {
        throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
      }

      // Check for any orders (historical data)
      const orderCount = await tx.order.count({
        where: { tableId }
      });

      if (orderCount > 0) {
        throw new ApiError(
          409,
          'TABLE_HAS_ORDERS',
          'Cannot delete table with order history'
        );
      }

      await tx.table.delete({
        where: { id: tableId }
      });
    });
  }

  /**
   * 🚨 EMERGENCY ONLY: Regenerate QR code for table
   * WARNING: This breaks the permanence guarantee!
   * Only use when absolutely necessary (damaged QR, security breach, etc.)
   */
  async regenerateQRCode(tableId: string, staffId: string): Promise<Table> {
    return await this.prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({
        where: { id: tableId },
        include: { restaurant: { select: { name: true } } }
      });

      if (!table) {
        throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
      }

      // Store old values for audit
      const oldCode = table.code;
      const oldQRUrl = table.qrCodeUrl;

      // Generate new permanent QR code and URL
      const { code: newCode, qrCodeUrl: newQRUrl } = regenerateTableCodeAndQR();

      // Ensure new code is unique
      const existingTable = await tx.table.findUnique({
        where: { code: newCode }
      });

      if (existingTable) {
        // Extremely rare collision - try again
        throw new ApiError(
          500, 
          'CODE_COLLISION', 
          'Generated code already exists. Please try again.'
        );
      }

      const updated = await tx.table.update({
        where: { id: tableId },
        data: { 
          code: newCode,
          qrCodeUrl: newQRUrl
        },
        include: this.getTableIncludes()
      });

      // 🚨 CRITICAL: Log this dangerous operation for audit
      console.error('🚨 QR CODE REGENERATED - BREAKS PERMANENCE GUARANTEE:', {
        action: 'QR_CODE_REGENERATED',
        tableId,
        tableNumber: table.number,
        restaurantName: table.restaurant?.name,
        staffId,
        oldCode,
        newCode,
        oldQRUrl,
        newQRUrl,
        timestamp: new Date().toISOString(),
        warning: 'Physical QR codes (printed materials) are now invalid!'
      });

      return updated;
    });
  }

  /**
   * Get table statistics
   */
  async getTableStatistics(restaurantId: string) {
    const [totalTables, availableTables, occupancyStats] = await Promise.all([
      this.prisma.table.count({ where: { restaurantId } }),
      this.prisma.table.count({
        where: { restaurantId, status: 'AVAILABLE' }
      }),
      this.prisma.order.groupBy({
        by: ['tableId'],
        where: {
          table: { restaurantId },
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        },
        _count: true
      })
    ]);

    const occupiedTables = totalTables - availableTables;
    const occupancyRate = totalTables > 0 
      ? Math.round((occupiedTables / totalTables) * 100)
      : 0;

    return {
      totalTables,
      availableTables,
      occupiedTables,
      occupancyRate,
      tablesWithOrders: occupancyStats.length,
      averageOrdersPerTable: occupancyStats.length > 0
        ? Math.round(
            occupancyStats.reduce((sum, stat) => sum + stat._count, 0) / 
            occupancyStats.length
          )
        : 0
    };
  }

  /**
   * Generate permanent, unique table code
   * Uses enhanced entropy and format validation for permanence
   */
  private async generatePermanentUniqueTableCode(tx: any): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 20; // Increased attempts for better collision handling

    do {
      // Generate code using our permanent QR utilities
      code = generateUniqueTableCode();
      
      // Validate format
      if (!isValidTableCode(code)) {
        attempts++;
        continue;
      }
      
      // Check uniqueness in database
      const existing = await tx.table.findUnique({
        where: { code }
      });

      if (!existing) break;

      attempts++;
      if (attempts >= maxAttempts) {
        throw new ApiError(
          500,
          'CODE_GENERATION_FAILED',
          'Failed to generate unique permanent table code after multiple attempts'
        );
      }
    } while (true);

    return code;
  }

  /**
   * Generate QR URL for table (DEPRECATED)
   * Use generatePermanentQRCodeURL from qr-code.ts instead
   * @deprecated This method is kept for backward compatibility only
   */
  private generateQRUrl(code: string, restaurantId: string): string {
    console.warn('DEPRECATED: generateQRUrl method used. Use generatePermanentQRCodeURL instead.');
    return generatePermanentQRCodeURL(code);
  }

  /**
   * Standard includes for table queries
   */
  private getTableIncludes() {
    return {
      restaurant: {
        select: { 
          id: true, 
          name: true,
          logoUrl: true
        }
      }
    };
  }
}