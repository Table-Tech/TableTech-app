import { Order, Prisma, OrderStatus, TableStatus } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import { 
  CreateOrderDTO, 
  CreateCustomerOrderDTO,
  UpdateOrderStatusDTO,
  OrderQueryDTO 
} from '../schemas/order.schema.js';
import {
  validateBusinessHours,
  validateOrderItems,
  validateOrderAmount,
  validateTableAvailability,
  validateStatusTransition,
  validateCustomerOrder,
  canModifyOrder
} from '../utils/logic-validation/order.validation.js';

export class OrderService extends BaseService<Prisma.OrderCreateInput, Order> {
  protected model = 'order' as const;

  /**
   * Create staff order
   */
  async createStaffOrder(data: CreateOrderDTO, staffId: string): Promise<Order> {
    // Business validation
    validateBusinessHours();
    validateOrderItems(data.items);

    return await this.prisma.$transaction(async (tx) => {
      // Validate restaurant and table
      const table = await tx.table.findFirst({
        where: { 
          id: data.tableId,
          restaurantId: data.restaurantId
        }
      });

      if (!table) {
        throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
      }

      // Validate table status (allow multiple orders per table)
      validateTableAvailability(table.status, false);

      // Process items and calculate total
      const { orderItems, totalAmount } = await this.processOrderItems(
        tx, 
        data.items, 
        data.restaurantId
      );

      validateOrderAmount(totalAmount);

      // Create order
      const orderNumber = await this.generateOrderNumber(tx, data.restaurantId);
      
      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          notes: data.notes,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          table: { connect: { id: data.tableId } },
          restaurant: { connect: { id: data.restaurantId } },
          orderItems: { create: orderItems }
        },
        include: this.getOrderIncludes()
      });

      // Update table status
      if (table.status === 'AVAILABLE') {
        await tx.table.update({
          where: { id: data.tableId },
          data: { status: 'OCCUPIED' }
        });
      }

      return order;
    });
  }

  /**
   * Create customer order (via QR)
   */
  async createCustomerOrder(data: CreateCustomerOrderDTO): Promise<Order> {
    validateCustomerOrder(data);

    return await this.prisma.$transaction(async (tx) => {
      // Find table by code
      const table = await tx.table.findUnique({
        where: { code: data.tableCode },
        include: { restaurant: true }
      });

      if (!table) {
        throw new ApiError(404, 'INVALID_TABLE_CODE', 'Invalid table code');
      }

      // Validate table status (allow multiple orders per table)
      validateTableAvailability(table.status, false);

      // Process items
      const { orderItems, totalAmount } = await this.processOrderItems(
        tx, 
        data.items, 
        table.restaurantId
      );

      validateOrderAmount(totalAmount);

      // Create order
      const orderNumber = await this.generateOrderNumber(tx, table.restaurantId);
      
      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          notes: data.notes,
          status: 'PENDING',
          paymentStatus: 'PENDING',
          table: { connect: { id: table.id } },
          restaurant: { connect: { id: table.restaurantId } },
          orderItems: { create: orderItems },

        },
        include: this.getOrderIncludes()
      });

      // Update table
      if (table.status === 'AVAILABLE') {
        await tx.table.update({
          where: { id: table.id },
          data: { status: 'OCCUPIED' }
        });
      }

      // TODO: Emit WebSocket event for new order

      return order;
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    data: UpdateOrderStatusDTO,
    staffId?: string
  ): Promise<Order> {
    return await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { table: true }
      });

      if (!order) {
        throw new ApiError(404, 'ORDER_NOT_FOUND', 'Order not found');
      }

      // Validate transition
      validateStatusTransition(order.status, data.status);

      // Update order
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: data.status,
          notes: data.notes ? `${order.notes}\n---\n${data.notes}` : order.notes
        },
        include: this.getOrderIncludes()
      });

      // Handle table status on completion/cancellation
      if (['COMPLETED', 'CANCELLED'].includes(data.status)) {
        const activeOrders = await tx.order.count({
          where: {
            tableId: order.tableId,
            id: { not: orderId },
            status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
          }
        });

        if (activeOrders === 0) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: 'AVAILABLE' }
          });
        }
      }

      // TODO: Emit WebSocket event for status change

      return updated;
    });
  }

  /**
   * Get orders with filters
   */
  async getOrders(restaurantId: string, query: OrderQueryDTO) {
    const where: Prisma.OrderWhereInput = { restaurantId };

    if (query.status) where.status = query.status;
    if (query.tableId) where.tableId = query.tableId;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: this.getOrderIncludes(),
        orderBy: { createdAt: 'desc' },
        take: query.limit,
        skip: query.offset
      }),
      this.prisma.order.count({ where })
    ]);

    return {
      orders,
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        pages: Math.ceil(total / query.limit)
      }
    };
  }

  /**
   * Get active orders for kitchen display
   */
  async getKitchenOrders(restaurantId: string) {
    return this.prisma.order.findMany({
      where: {
        restaurantId,
        status: { in: ['CONFIRMED', 'PREPARING'] }
      },
      include: {
        ...this.getOrderIncludes(),
        orderItems: {
          where: {
            status: { in: ['PENDING', 'PREPARING'] }
          },
          include: {
            menuItem: true,
            modifiers: {
              include: { modifier: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Process order items and calculate total
   */
  private async processOrderItems(
    tx: any,
    items: CreateOrderDTO['items'],
    restaurantId: string
  ) {
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = await tx.menuItem.findFirst({
        where: {
          id: item.menuId,
          restaurantId,
          isAvailable: true
        },
        include: {
          modifierGroups: {
            include: { modifiers: true }
          }
        }
      });

      if (!menuItem) {
        throw new ApiError(404, 'MENU_ITEM_UNAVAILABLE', 'Menu item not available');
      }

      let itemPrice = Number(menuItem.price);
      const modifiers = [];

      // Process modifiers
      if (item.modifiers?.length) {
        const validModifiers = await tx.modifier.findMany({
          where: {
            id: { in: item.modifiers },
            modifierGroup: {
              menuItemId: menuItem.id
            }
          }
        });

        if (validModifiers.length !== item.modifiers.length) {
          throw new ApiError(404, 'INVALID_MODIFIERS', 'Invalid modifiers selected');
        }

        for (const modifier of validModifiers) {
          itemPrice += Number(modifier.price);
          modifiers.push({
            modifier: { connect: { id: modifier.id } },
            price: modifier.price
          });
        }
      }

      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        quantity: item.quantity,
        price: menuItem.price,
        notes: item.notes,
        menuItem: { connect: { id: item.menuId } },
        modifiers: modifiers.length ? { create: modifiers } : undefined
      });
    }

    return { orderItems, totalAmount };
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(tx: any, restaurantId: string): Promise<string> {
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
    
    // Get today's order count
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const todayEnd = new Date(date.setHours(23, 59, 59, 999));
    
    const count = await tx.order.count({
      where: {
        restaurantId,
        createdAt: {
          gte: todayStart,
          lte: todayEnd
        }
      }
    });

    return `ORD-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { orderNumber },
      include: this.getOrderIncludes()
    });
  }

  /**
   * Validate table access for customers
   */
  async validateTableAccess(tableCode: string, restaurantId: string) {
    const table = await this.prisma.table.findFirst({
      where: { 
        code: tableCode,
        restaurantId 
      },
      include: {
        restaurant: {
          select: { id: true, name: true, logoUrl: true }
        }
      }
    });

    if (!table) {
      throw new ApiError(404, 'INVALID_TABLE_CODE', 'Invalid table code');
    }

    return table;
  }

  /**
   * Get active orders for a table
   */
  async getActiveTableOrders(tableCode: string) {
    return this.prisma.order.findMany({
      where: {
        table: { code: tableCode },
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
      },
      include: this.getOrderIncludes(),
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get order statistics
   */
  async getStatistics(restaurantId: string) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [totalOrders, todayOrders, activeOrders, revenue] = await Promise.all([
      this.prisma.order.count({ where: { restaurantId } }),
      this.prisma.order.count({
        where: {
          restaurantId,
          createdAt: { gte: startOfDay, lte: endOfDay }
        }
      }),
      this.prisma.order.count({
        where: {
          restaurantId,
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
        }
      }),
      this.prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: startOfDay, lte: endOfDay },
          status: { not: 'CANCELLED' }
        },
        _sum: { totalAmount: true }
      })
    ]);

    return {
      totalOrders,
      todayOrders,
      activeOrders,
      todayRevenue: revenue._sum.totalAmount || 0
    };
  }

  /**
   * Standard includes for order queries
   */
  private getOrderIncludes() {
    return {
      orderItems: {
        include: {
          menuItem: {
            select: { id: true, name: true, price: true, preparationTime: true }
          },
          modifiers: {
            include: {
              modifier: {
                select: { id: true, name: true, price: true }
              }
            }
          }
        }
      },
      table: {
        select: { id: true, number: true, code: true }
      },
      restaurant: {
        select: { id: true, name: true }
      }
    };
  }
}