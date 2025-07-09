// src/controllers/order.controller.ts
import { FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { OrderService } from '../services/order.service.js';
import {
  CreateOrderDTO,
  OrderParamsDTO,
} from '../schemas/order.schema.js';
import { 
  enforceOrderRules, 
  convertOrderDTOToPrisma 
} from '../utils/logic-validation/order.validation.js';

export class OrderController {
  private svc = new OrderService();

  /** POST /orders */
  async create(
    req: AuthenticatedRequest<CreateOrderDTO>,
    reply: FastifyReply
  ) {
    // 1) Basic business rule validation
    enforceOrderRules(req.body);

    // 2) Convert DTO to Prisma format with business logic
    const prismaOrderData = await convertOrderDTOToPrisma(
      req.body,
      req.user?.staffId || 'customer' // TEMPORARY FIX FOR TESTING
    );

    // 3) Persist using service
    const order = await this.svc.create(prismaOrderData);

    return reply.status(201).send({ success: true, data: order });
  }

  /** GET /orders/:id */
  async findById(
    req: AuthenticatedRequest<unknown, OrderParamsDTO>,
    reply: FastifyReply
  ) {
    const order = await this.svc.findById(req.params.id);
    if (!order) {
      throw new ApiError(404, 'NOT_FOUND', 'Order not found');
    }
    return reply.send({ success: true, data: order });
  }

  /** GET /orders */
  async list(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    // Use restaurant filtering for security
    const { orders, total } = await this.svc.findByRestaurant(
      req.user.restaurantId,
      {
        limit: 20,
        offset: 0
      }
    );
    return reply.send({ 
      success: true, 
      data: orders,
      pagination: { total, limit: 20, offset: 0 }
    });
  }

  /** PATCH /orders/:id/status */
  async updateStatus(
    req: AuthenticatedRequest<{ status: string; notes?: string }, OrderParamsDTO>,
    reply: FastifyReply
  ) {
    const { status, notes } = req.body;
    
    // Get current order to validate transition
    const currentOrder = await this.svc.findById(req.params.id);
    if (!currentOrder) {
      throw new ApiError(404, 'NOT_FOUND', 'Order not found');
    }

    // Validate status transition
    const { validateStatusTransition } = await import('../utils/logic-validation/order.validation.js');
    validateStatusTransition(currentOrder.status, status);

    // Update status
    const updated = await this.svc.updateStatus(
      req.params.id,
      status as any,
      notes
    );

    // Update table status if order is completed/cancelled
    if (status === 'COMPLETED' || status === 'CANCELLED') {
      // Check if there are other active orders on this table
      const { orders } = await this.svc.findByRestaurant(req.user.restaurantId, {
        tableId: currentOrder.table.id,
        limit: 1
      });
      
      const hasOtherActiveOrders = orders.some(order => 
        order.id !== req.params.id && 
        ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'].includes(order.status)
      );

      if (!hasOtherActiveOrders) {
        await this.svc.updateTableStatus(currentOrder.table.id, 'AVAILABLE');
      }
    }

    return reply.send({ success: true, data: updated });
  }

  /** DELETE /orders/:id */
  async delete(
    req: AuthenticatedRequest<unknown, OrderParamsDTO>,
    reply: FastifyReply
  ) {
    await this.svc.delete(req.params.id);
    return reply.send({ success: true, data: null });
  }

  /** GET /orders/statistics */
  async getStatistics(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const stats = await this.svc.getStatistics(req.user.restaurantId);
    return reply.send({ success: true, data: stats });
  }

  /** GET /orders/active-count */
  async getActiveCount(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const count = await this.svc.getActiveOrdersCount(req.user.restaurantId);
    return reply.send({ success: true, data: { activeCount: count } });
  }
}