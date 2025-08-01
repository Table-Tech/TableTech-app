import { Order, Prisma, OrderStatus, TableStatus, MenuItem, Modifier } from '@prisma/client';
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
import { logger, createRequestLogger } from '../utils/logger.js';
import { audit } from '../utils/audit.js';
import { FastifyRequest } from 'fastify';

// Types for the processed data
type MenuItemWithModifiers = MenuItem & {
  modifierGroups: Array<{
    id: string;
    modifiers: Modifier[];
  }>;
};

export class OrderService extends BaseService<Prisma.OrderCreateInput, Order> {
  protected model = 'order' as const;

    /**
   * Create staff order
   */
  async createStaffOrder(data: CreateOrderDTO, staffId: string, req?: FastifyRequest): Promise<Order> {
    const timer = Date.now();
    const reqLogger = req ? createRequestLogger(req) : logger.base;
    
    reqLogger.info({ 
      orderData: { 
        tableId: data.tableId, 
        restaurantId: data.restaurantId, 
        itemCount: data.items.length 
      },
      staffId 
    }, 'Creating staff order');

    // Business validation
    validateBusinessHours();
    validateOrderItems(data.items);

    return await this.prisma.$transaction(async (tx) => {
      // ── 1. Check restaurant & table ───────────────────────────────
      const table = await tx.table.findFirst({
        where: {
          id: data.tableId,
          restaurantId: data.restaurantId,
        },
      });

      if (!table) {
        throw new ApiError(404, "TABLE_NOT_FOUND", "Table not found");
      }

      validateTableAvailability(table.status, false);

      // ── 2. Process items & totals ─────────────────────────────────
      const { orderItems, financials } = await this.processOrderItems(
        tx,
        data.items,
        data.restaurantId
      );

      validateOrderAmount(financials.totalAmount);

      // ── 3. Create order with duplicate-number retry ───────────────
      let order: Order | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const orderNumber = await this.generateOrderNumber(tx, data.restaurantId);

        try {
          order = await tx.order.create({
            data: {
              orderNumber,
              subtotal: financials.subtotal,
              taxAmount: financials.taxAmount,
              totalAmount: financials.totalAmount,
              notes: data.notes,
              status: "PENDING",
              paymentStatus: "PENDING",
              tableId: data.tableId,
              restaurantId: data.restaurantId,
              orderItems: { create: orderItems },
            },
            include: this.getOrderIncludes(),
          });
          break; // ✅ success → exit loop
        } catch (err: any) {
          // Prisma duplicate key → try again, anything else → rethrow
          if (err.code !== "P2002") throw err;
        }
      }

      if (!order) {
        throw new ApiError(
          500,
          "ORDER_NUMBER_RACE",
          "Could not generate a unique order number"
        );
      }

      // ── 4. Update table status ────────────────────────────────────
      if (table.status === "AVAILABLE") {
        await tx.table.update({
          where: { id: data.tableId },
          data:  { status: "OCCUPIED" },
        });
      }

      // Emit WebSocket event for new order
      if (global.wsService && order) {
        await global.wsService.emitNewOrder(order);
      }

      // ── 6. Logging & Audit ────────────────────────────────────────
      const duration = Date.now() - timer;
      
      // Performance logging
      logger.perf.timing('createStaffOrder', duration, { 
        orderId: order.id, 
        itemCount: data.items.length 
      });
      
      // Business metrics
      logger.business.revenue(
        Number(order.totalAmount), 
        order.id, 
        order.restaurantId,
        { orderType: 'staff', staffId }
      );
      
      // Audit logging (permanent record)
      if (req) {
        await audit.orderCreated(order, req);
      }
      
      reqLogger.info({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        duration
      }, 'Staff order created successfully');

      return order;
    });
  }


  /**
   * Create customer order (via QR)
  */
  async createCustomerOrder(data: CreateCustomerOrderDTO, sessionToken?: string, req?: FastifyRequest): Promise<Order> {
    console.log('🍕 DEBUG: OrderService.createCustomerOrder called with data:', JSON.stringify(data, null, 2));
    console.log('🍕 DEBUG: SessionToken:', sessionToken ? 'present' : 'none');
    
    const timer = Date.now();
    const reqLogger = req ? createRequestLogger(req) : logger.base;
    
    reqLogger.info({ 
      orderData: { 
        tableCode: data.tableCode, 
        itemCount: data.items.length,
        customerName: data.customerName 
      },
      sessionToken: sessionToken ? 'present' : 'none'
    }, 'Creating customer order');

    console.log('🍕 DEBUG: Validating customer order...');
    validateCustomerOrder(data);
    console.log('🍕 DEBUG: Customer order validation passed');

    return await this.prisma.$transaction(async (tx) => {
      console.log('🍕 DEBUG: Starting database transaction');
      
      // ── 1. Look up table & restaurant ───────────────────────────
      console.log('🍕 DEBUG: Looking up table with code:', data.tableCode);
      const table = await tx.table.findUnique({
        where:   { code: data.tableCode },
        include: { restaurant: true },
      });

      console.log('🍕 DEBUG: Table lookup result:', table ? { 
        id: table.id, 
        number: table.number, 
        status: table.status, 
        restaurantId: table.restaurantId 
      } : 'null');

      if (!table) {
        console.log('🍕 DEBUG: Table not found, throwing error');
        throw new ApiError(404, "INVALID_TABLE_CODE", "Invalid table code");
      }

      console.log('🍕 DEBUG: Validating table availability...');
      validateTableAvailability(table.status, false);
      console.log('🍕 DEBUG: Table availability validation passed');

      // ── 2. Process items & totals ───────────────────────────────
      console.log('🍕 DEBUG: Processing order items...');
      const { orderItems, financials } = await this.processOrderItems(
        tx,
        data.items,
        table.restaurantId
      );

      console.log('🍕 DEBUG: Order items processed:', { 
        itemCount: orderItems.length, 
        financials 
      });

      validateOrderAmount(financials.totalAmount);
      console.log('🍕 DEBUG: Order amount validation passed');

      // ── 3. Create order with duplicate-key retry ────────────────
      let order: Order | null = null;

      console.log('🍕 DEBUG: Starting order creation with retry logic...');
      for (let attempt = 0; attempt < 3; attempt++) {
        console.log(`🍕 DEBUG: Order creation attempt ${attempt + 1}/3`);
        
        const orderNumber = await this.generateOrderNumber(tx, table.restaurantId);
        console.log('🍕 DEBUG: Generated order number:', orderNumber);

        try {
          console.log('🍕 DEBUG: Creating order in database...');
          order = await tx.order.create({
            data: {
              orderNumber,
              subtotal: financials.subtotal,
              taxAmount: financials.taxAmount,
              totalAmount: financials.totalAmount,
              sessionId: sessionToken?.replace('sess_', '') || null, // Link to customer session
              notes: data.notes,
              status: "PENDING",
              paymentStatus: "PENDING",
              tableId: table.id,
              restaurantId: table.restaurantId,
              orderItems: { create: orderItems },
            },
            include: this.getOrderIncludes(),
          });
          console.log('🍕 DEBUG: Order created successfully on attempt', attempt + 1);
          break; // ✅ success – exit loop
        } catch (err: any) {
          console.log(`🍕 DEBUG: Order creation attempt ${attempt + 1} failed:`, err.message);
          console.log('🍕 DEBUG: Error code:', err.code);
          if (err.code !== "P2002") {
            console.log('🍕 DEBUG: Non-duplicate error, rethrowing');
            throw err; // other DB error
          }
          console.log('🍕 DEBUG: Duplicate orderNumber detected, retrying...');
          // else duplicate orderNumber – loop to try again
        }
      }

      if (!order) {
        console.log('🍕 DEBUG: All order creation attempts failed, throwing error');
        throw new ApiError(
          500,
          "ORDER_NUMBER_RACE",
          "Could not generate a unique order number"
        );
      }

      console.log('🍕 DEBUG: Order created successfully:', {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus
      });

      // ── 4. Update table status if it was AVAILABLE ──────────────
      if (table.status === "AVAILABLE") {
        console.log('🍕 DEBUG: Updating table status to OCCUPIED');
        await tx.table.update({
          where: { id: table.id },
          data:  { status: "OCCUPIED" },
        });
        console.log('🍕 DEBUG: Table status updated');
      }

      // Emit WebSocket event for new order
      if (global.wsService && order) {
        console.log('🍕 DEBUG: Emitting WebSocket event for new order');
        await global.wsService.emitNewOrder(order);
      }

      // ── 5. Logging & Audit (Customer Order) ───────────────────────
      const duration = Date.now() - timer;
      
      // Performance logging
      logger.perf.timing('createCustomerOrder', duration, { 
        orderId: order.id, 
        itemCount: data.items.length,
        tableCode: data.tableCode
      });
      
      // Business metrics & customer behavior
      logger.business.revenue(
        Number(order.totalAmount), 
        order.id, 
        order.restaurantId,
        { orderType: 'customer', sessionToken }
      );
      
      if (sessionToken) {
        logger.business.customerBehavior(
          'order_placed', 
          sessionToken, 
          table.id,
          { itemCount: data.items.length, amount: Number(order.totalAmount) }
        );
      }
      
      // Audit logging (permanent record)
      if (req) {
        await audit.orderCreated(order, req);
      }
      
      reqLogger.info({
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        duration,
        tableCode: data.tableCode
      }, 'Customer order created successfully');

      console.log('🍕 DEBUG: Order service returning order:', {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: Number(order.totalAmount),
        restaurantId: order.restaurantId
      });

      return order;
    });
  }


  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string, 
    data: UpdateOrderStatusDTO,
    staffId?: string,
    req?: FastifyRequest
  ): Promise<Order> {
    const timer = Date.now();
    const reqLogger = req ? createRequestLogger(req) : logger.base;
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

      // Emit WebSocket event for status change
      if (global.wsService && updated && order.status !== updated.status) {
        await global.wsService.emitOrderStatusUpdate(updated, order.status);
      }

      // ── Logging & Audit (Order Status Update) ─────────────────────
      const duration = Date.now() - timer;
      
      // Performance logging
      logger.perf.timing('updateOrderStatus', duration, { 
        orderId, 
        statusChange: `${order.status} -> ${data.status}`
      });
      
      // Business metrics for completion
      if (data.status === 'COMPLETED' && updated) {
        logger.business.orderMetrics(orderId, order.restaurantId, {
          itemCount: updated.orderItems?.length || 0,
          tableNumber: order.table.number,
          preparationTime: updated.completedAt && order.createdAt ? 
            Math.round((updated.completedAt.getTime() - order.createdAt.getTime()) / 1000 / 60) : undefined
        });
      }
      
      // Audit logging for status changes
      if (req && staffId) {
        await audit.orderStatusChanged(orderId, order.status, data.status, staffId, req);
        
        // Special audit for cancellations
        if (data.status === 'CANCELLED') {
          await audit.orderCancelled(orderId, data.notes || 'No reason provided', staffId, req);
        }
      }
      
      reqLogger.info({
        orderId,
        statusChange: `${order.status} -> ${data.status}`,
        staffId,
        duration
      }, `Order status updated to ${data.status}`);

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
   * Process order items and calculate total (optimized - batched queries)
   */
  private async processOrderItems(
    tx: any,
    items: CreateOrderDTO['items'],
    restaurantId: string
  ) {
    // ── 1. Batch fetch all menu items ─────────────────────────────────────
    const menuItemIds = items.map(item => item.menuId);
    const menuItems = await tx.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId,
        isAvailable: true
      },
      include: {
        modifierGroups: {
          include: { modifiers: true }
        }
      }
    });

    // Create lookup map for O(1) access
    const menuItemMap = new Map<string, MenuItemWithModifiers>(
      menuItems.map((item: MenuItemWithModifiers) => [item.id, item])
    );

    // ── 2. Batch fetch all modifiers if needed ───────────────────────────
    const allModifierIds = items
      .filter(item => item.modifiers?.length)
      .flatMap(item => item.modifiers || []);
    
    let modifierMap = new Map<string, Modifier>();
    if (allModifierIds.length > 0) {
      const modifiers = await tx.modifier.findMany({
        where: {
          id: { in: allModifierIds },
          modifierGroup: {
            menuItem: {
              restaurantId,
              id: { in: menuItemIds }
            }
          }
        }
      });
      modifierMap = new Map<string, Modifier>(
        modifiers.map((mod: Modifier) => [mod.id, mod])
      );
    }

    // ── 3. Process items using cached data ───────────────────────────────
    let subtotalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const menuItem = menuItemMap.get(item.menuId);
      if (!menuItem) {
        throw new ApiError(404, 'MENU_ITEM_UNAVAILABLE', `Menu item ${item.menuId} not available`);
      }

      let itemPrice = Number(menuItem.price);
      const modifiers = [];

      // Process modifiers using cached data
      if (item.modifiers?.length) {
        for (const modifierId of item.modifiers) {
          const modifier = modifierMap.get(modifierId);
          if (!modifier) {
            throw new ApiError(404, 'INVALID_MODIFIERS', `Invalid modifier: ${modifierId}`);
          }
          
          itemPrice += Number(modifier.price);
          modifiers.push({
            modifier: { connect: { id: modifier.id } },
            price: modifier.price
          });
        }
      }

      const itemTotal = itemPrice * item.quantity;
      subtotalAmount += itemTotal;

      orderItems.push({
        quantity: item.quantity,
        price: menuItem.price,
        notes: item.notes,
        menuItem: { connect: { id: item.menuId } },
        modifiers: modifiers.length ? { create: modifiers } : undefined
      });
    }

    // ── 4. Calculate Dutch BTW tax compliance (dynamic rate) ──────────────
    const taxRate = await this.getRestaurantTaxRate(tx, restaurantId);
    const subtotal = Math.round(subtotalAmount * 100) / 100; // Round to 2 decimals
    const taxAmount = Math.round(subtotal * (taxRate / 100) * 100) / 100; // BTW percentage
    const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;

    const financials = {
      subtotal,
      taxAmount,
      totalAmount
    };

    return { orderItems, financials };
  }

  /**
   * Get restaurant tax rate (9% for Dutch restaurants)
   */
  private async getRestaurantTaxRate(tx: any, restaurantId: string): Promise<number> {
    const restaurant = await tx.restaurant.findUnique({
      where: { id: restaurantId },
      select: { taxRate: true }
    });
    return restaurant?.taxRate ? Number(restaurant.taxRate) : 9.0; // Default to 9% Dutch BTW
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