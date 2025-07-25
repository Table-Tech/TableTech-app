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

      // Generate unique table code
      const code = await this.generateUniqueTableCode(tx);

      // Create table
      const table = await tx.table.create({
        data: {
          number: data.number,
          code,
          capacity: data.capacity || 4,
          status: 'AVAILABLE',
          restaurant: { connect: { id: data.restaurantId } },
          qrCodeUrl: this.generateQRUrl(code, data.restaurantId)
        },
        include: this.getTableIncludes()
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

      // Create all tables
      const createdTables = [];
      for (const tableData of tables) {
        validateTableCapacity(tableData.capacity);
        
        const code = await this.generateUniqueTableCode(tx);
        const table = await tx.table.create({
          data: {
            number: tableData.number,
            code,
            capacity: tableData.capacity || 4,
            status: 'AVAILABLE',
            restaurant: { connect: { id: restaurantId } },
            qrCodeUrl: this.generateQRUrl(code, restaurantId)
          },
          include: this.getTableIncludes()
        });
        
        createdTables.push(table);
      }

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

      const updated = await tx.table.update({
        where: { id: tableId },
        data: {
          ...(data.number && { number: data.number }),
          ...(data.capacity && { capacity: data.capacity })
        },
        include: this.getTableIncludes()
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
   * Regenerate QR code for table
   */
  async regenerateQRCode(tableId: string, staffId: string): Promise<Table> {
    return await this.prisma.$transaction(async (tx) => {
      const table = await tx.table.findUnique({
        where: { id: tableId }
      });

      if (!table) {
        throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
      }

      // Generate new code
      const newCode = await this.generateUniqueTableCode(tx);
      const qrCodeUrl = this.generateQRUrl(newCode, table.restaurantId);

      const updated = await tx.table.update({
        where: { id: tableId },
        data: { 
          code: newCode,
          qrCodeUrl 
        },
        include: this.getTableIncludes()
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
   * Generate unique table code
   */
  private async generateUniqueTableCode(tx: any): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate 6-character alphanumeric code
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
      
      const existing = await tx.table.findUnique({
        where: { code }
      });

      if (!existing) break;

      attempts++;
      if (attempts >= maxAttempts) {
        throw new ApiError(
          500,
          'CODE_GENERATION_FAILED',
          'Failed to generate unique table code'
        );
      }
    } while (true);

    return code;
  }

  /**
   * Generate QR URL for table
   */
  private generateQRUrl(code: string, restaurantId: string): string {
    const frontendDomain = process.env.FRONTEND_URL || 'https://your-app.com';
    return `${frontendDomain}/menu/${code}`;
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