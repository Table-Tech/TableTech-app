import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest, getRestaurantId } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { TableService } from '../services/table.service.js';
import {
  CreateTableSchema,
  BulkCreateTablesSchema,
  UpdateTableSchema,
  UpdateTableStatusSchema,
  TableQuerySchema,
  TableParamsSchema,
  ValidateTableSchema
} from '../schemas/table.schema.js';

export class TableController {
  private svc = new TableService();

  /** POST /tables - Create single table */
  async createTable(
    req: AuthenticatedRequest<z.infer<typeof CreateTableSchema>>,
    reply: FastifyReply
  ) {
    // Ensure user can only create tables for their restaurant
    if (req.body.restaurantId !== getRestaurantId(req)) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot create tables for other restaurants');
    }

    const table = await this.svc.createTable(req.body, req.user.staffId);
    return reply.status(201).send({ success: true, data: table });
  }

  /** POST /tables/bulk - Create multiple tables */
  async bulkCreateTables(
    req: AuthenticatedRequest<z.infer<typeof BulkCreateTablesSchema>>,
    reply: FastifyReply
  ) {
    if (req.body.restaurantId !== getRestaurantId(req)) {
      throw new ApiError(403, 'FORBIDDEN', 'Cannot create tables for other restaurants');
    }

    const tables = await this.svc.bulkCreateTables(req.body, req.user.staffId);
    return reply.status(201).send({ 
      success: true, 
      data: tables,
      message: `Created ${tables.length} tables successfully`
    });
  }

  /** GET /tables - List tables */
  async listTables(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof TableQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.getTables(getRestaurantId(req), req.query);
    return reply.send({ 
      success: true, 
      data: result.tables,
      pagination: result.pagination
    });
  }

  /** GET /tables/:id - Get table details */
  async getTableById(
    req: AuthenticatedRequest<unknown, z.infer<typeof TableParamsSchema>>,
    reply: FastifyReply
  ) {
    const table = await this.svc.findById(req.params.id);
    
    if (!table) {
      throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
    }
    
    // Verify table belongs to user's restaurant
    if (table.restaurantId !== getRestaurantId(req)) {
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    }
    
    return reply.send({ success: true, data: table });
  }

  /** PATCH /tables/:id - Update table */
  async updateTable(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateTableSchema>,
      z.infer<typeof TableParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const table = await this.svc.updateTable(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ success: true, data: table });
  }

  /** PATCH /tables/:id/status - Update table status */
  async updateTableStatus(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateTableStatusSchema>,
      z.infer<typeof TableParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const table = await this.svc.updateTableStatus(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ success: true, data: table });
  }

  /** DELETE /tables/:id - Delete table */
  async deleteTable(
    req: AuthenticatedRequest<unknown, z.infer<typeof TableParamsSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.deleteTable(req.params.id, req.user.staffId);
    return reply.send({ success: true, message: 'Table deleted successfully' });
  }

  /** POST /tables/:id/regenerate-qr - Regenerate QR code */
  async regenerateQRCode(
    req: AuthenticatedRequest<unknown, z.infer<typeof TableParamsSchema>>,
    reply: FastifyReply
  ) {
    const table = await this.svc.regenerateQRCode(req.params.id, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: {
        tableId: table.id,
        code: table.code,
        qrCodeUrl: table.qrCodeUrl,
        message: 'QR code regenerated successfully'
      }
    });
  }

  /** GET /tables/statistics - Get table statistics */
  async getTableStatistics(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const stats = await this.svc.getTableStatistics(getRestaurantId(req));
    return reply.send({ success: true, data: stats });
  }

  // =================== CUSTOMER ENDPOINTS ===================

  /** POST /customer/validate-table - Validate table code */
  async validateTable(
    req: FastifyRequest<{ Body: z.infer<typeof ValidateTableSchema> }>,
    reply: FastifyReply
  ) {
    const table = await this.svc.getTableByCode(req.body.code);

    if (!table) {
      throw new ApiError(404, 'INVALID_TABLE_CODE', 'Invalid table code');
    }

    return reply.send({
      success: true,
      data: {
        tableId: table.id,
        tableNumber: table.number,
        restaurant: {
          id: table.restaurant.id,
          name: table.restaurant.name,
          logoUrl: table.restaurant.logoUrl
        },
        canOrder: table.status !== 'MAINTENANCE',
        status: table.status
      }
    });
  }
}