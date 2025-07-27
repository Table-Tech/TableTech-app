import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest, getRestaurantId } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { OrderService } from '../services/order.service.js';
import {
  CreateOrderSchema,
  CreateCustomerOrderSchema,
  UpdateOrderStatusSchema,
  OrderQuerySchema,
  OrderParamsSchema,
  CustomerAuthSchema
} from '../schemas/order.schema.js';

export class OrderController {
  private svc = new OrderService();

  // =================== STAFF ENDPOINTS ===================

  /** POST /orders - Staff creates order */
  async createStaffOrder(
    req: AuthenticatedRequest<z.infer<typeof CreateOrderSchema>>,
    reply: FastifyReply
  ) {
    const order = await this.svc.createStaffOrder(req.body, req.user.staffId);
    return reply.status(201).send({ success: true, data: order });
  }

  /** GET /orders - List orders */
  async listOrders(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof OrderQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.getOrders(getRestaurantId(req), req.query);
    return reply.send({ 
      success: true, 
      data: result.orders,
      pagination: result.pagination
    });
  }

  /** GET /orders/:id - Get order details */
  async getOrderById(
    req: AuthenticatedRequest<unknown, z.infer<typeof OrderParamsSchema>>,
    reply: FastifyReply
  ) {
    const order = await this.svc.findById(req.params.id);
    if (!order) {
      throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }
    
    // Verify order belongs to user's restaurant
    if (order.restaurantId !== getRestaurantId(req)) {
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    }
    
    return reply.send({ success: true, data: order });
  }

  /** PATCH /orders/:id/status - Update order status */
  async updateOrderStatus(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateOrderStatusSchema>,
      z.infer<typeof OrderParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const order = await this.svc.updateOrderStatus(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ success: true, data: order });
  }

  /** GET /orders/kitchen - Kitchen display */
  async getKitchenOrders(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const orders = await this.svc.getKitchenOrders(getRestaurantId(req));
    return reply.send({ success: true, data: orders });
  }

  /** GET /orders/statistics - Order statistics */
  async getOrderStatistics(
    req: AuthenticatedRequest,
    reply: FastifyReply
  ) {
    const stats = await this.svc.getStatistics(getRestaurantId(req));
    return reply.send({ success: true, data: stats });
  }

  /** DELETE /orders/:id - Cancel order */
  async cancelOrder(
    req: AuthenticatedRequest<unknown, z.infer<typeof OrderParamsSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.updateOrderStatus(
      req.params.id,
      { status: 'CANCELLED', notes: 'Cancelled by staff' },
      req.user.staffId
    );
    return reply.send({ success: true, message: 'Order cancelled' });
  }

  // =================== CUSTOMER ENDPOINTS ===================

  /** POST /customer/orders - Customer creates order */
  async createCustomerOrder(
    req: FastifyRequest<{ Body: z.infer<typeof CreateCustomerOrderSchema> }>,
    reply: FastifyReply
  ) {
    const order = await this.svc.createCustomerOrder(req.body);
    return reply.status(201).send({ 
      success: true, 
      data: {
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        estimatedTime: this.calculateEstimatedTime(order),
        message: 'Order placed successfully'
      }
    });
  }

  /** GET /customer/orders/:orderNumber - Track customer order */
  async trackCustomerOrder(
    req: FastifyRequest<{ Params: { orderNumber: string } }>,
    reply: FastifyReply
  ) {
    const order = await this.svc.findByOrderNumber(req.params.orderNumber);
    
    if (!order) {
      throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
    }

    return reply.send({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        estimatedTime: this.calculateEstimatedTime(order),
        history: this.getStatusHistory(order)
      }
    });
  }

  /** POST /customer/validate-table - Validate table code */
  async validateTableCode(
    req: FastifyRequest<{ Body: z.infer<typeof CustomerAuthSchema> }>,
    reply: FastifyReply
  ) {
    const table = await this.svc.validateTableAccess(
      req.body.tableCode,
      req.body.restaurantId
    );

    return reply.send({
      success: true,
      data: {
        tableNumber: table.number,
        restaurant: {
          name: table.restaurant.name,
          logoUrl: table.restaurant.logoUrl
        },
        canOrder: table.status !== 'MAINTENANCE'
      }
    });
  }

  /** GET /customer/orders/table/:tableCode - Get active orders for table */
  async getTableOrders(
    req: FastifyRequest<{ Params: { tableCode: string } }>,
    reply: FastifyReply
  ) {
    const orders = await this.svc.getActiveTableOrders(req.params.tableCode);
    
    return reply.send({
      success: true,
      data: orders.map(order => ({
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        placedAt: order.createdAt
      }))
    });
  }

  // =================== HELPER METHODS ===================

  private calculateEstimatedTime(order: any): number {
    // Base time on order status
    const statusTimes: Record<string, number> = {
      PENDING: 30,
      CONFIRMED: 25,
      PREPARING: 20,
      READY: 5,
      DELIVERED: 0,
      COMPLETED: 0
    };

    // Get max preparation time from items
    const maxPrepTime = Math.max(
      ...order.orderItems.map((item: any) => 
        item.menuItem.preparationTime || 20
      )
    );

    return statusTimes[order.status] || maxPrepTime;
  }

  private getStatusHistory(order: any) {
    // Simple status history based on current status
    const history = [
      { status: 'PENDING', timestamp: order.createdAt, message: 'Order placed' }
    ];

    if (['CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
      history.push({ status: 'CONFIRMED', timestamp: order.updatedAt, message: 'Order confirmed' });
    }

    if (['PREPARING', 'READY', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
      history.push({ status: 'PREPARING', timestamp: order.updatedAt, message: 'Preparing your order' });
    }

    if (['READY', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
      history.push({ status: 'READY', timestamp: order.updatedAt, message: 'Order ready' });
    }

    if (['DELIVERED', 'COMPLETED'].includes(order.status)) {
      history.push({ status: 'DELIVERED', timestamp: order.updatedAt, message: 'Order delivered' });
    }

    if (order.status === 'COMPLETED') {
      history.push({ status: 'COMPLETED', timestamp: order.updatedAt, message: 'Order completed' });
    }

    return history;
  }
}