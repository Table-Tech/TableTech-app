// src/services/order.service.ts
import { prisma } from "../utils/prisma.js";
import { v4 as uuidv4 } from "uuid";
import { formatPriceNumber } from "../utils/price.js";
import { ResourceNotFoundError } from "../types/errors.js";
import { 
  MenuItemNotAvailableError, 
  ModifierNotAvailableError,
  TableUnavailableError,
  OrderValueError,
  DuplicateOrderError
} from "../types/errors/order.errors.js";
import { OrderValidation } from "../utils/validation/order.validation.js";
import { OrderAuditLogger } from "../utils/audit/order.audit.js";

type CreateOrderInput = {
  tableId: string;
  restaurantId: string;
  notes?: string;
  orderItems: {
    menuItemId: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
  }[];
};

type GetOrdersQuery = {
  restaurantId?: string;
  status?: string;
  tableId?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
};

type UpdateOrderStatusInput = {
  status: string;
  estimatedTime?: number;
  notes?: string;
};

export const createOrder = async (
  data: CreateOrderInput, 
  requestId?: string, 
  clientIP?: string
) => {
  // Enhanced business validation
  OrderValidation.validateOrderTiming(data.restaurantId);

  return await prisma.$transaction(async (tx) => {
    // 1. Validate table exists, belongs to restaurant, and is available
    const table = await tx.table.findFirst({
      where: { 
        id: data.tableId, 
        restaurantId: data.restaurantId 
      }
    });
    
    if (!table) {
      throw new ResourceNotFoundError('Table', data.tableId);
    }

    // Validate table availability - now throws specific error
    if (table.status !== 'AVAILABLE' && table.status !== 'OCCUPIED') {
      throw new TableUnavailableError(table.number);
    }

    // 2. Check for existing pending orders on this table
    const existingOrder = await tx.order.findFirst({
      where: {
        tableId: data.tableId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] }
      }
    });

    if (existingOrder) {
      throw new DuplicateOrderError(data.tableId);
    }

    // 3. Validate and calculate order total
    let totalAmount = 0;
    const processedOrderItems = [];

    for (const item of data.orderItems) {
      // Get menu item with validation
      const menuItem = await tx.menuItem.findFirst({
        where: { 
          id: item.menuItemId,
          restaurantId: data.restaurantId,
          isAvailable: true
        },
        select: { 
          id: true, 
          price: true, 
          name: true,
          preparationTime: true
        }
      });

      if (!menuItem) {
        throw new MenuItemNotAvailableError(item.menuItemId);
      }

      // Validate and get modifier prices
      let modifierTotal = 0;
      const processedModifiers = [];

      if (item.modifiers && item.modifiers.length > 0) {
        const modifiers = await tx.modifier.findMany({
          where: { 
            id: { in: item.modifiers },
            modifierGroup: {
              menuItem: {
                restaurantId: data.restaurantId
              }
            }
          },
          select: { 
            id: true, 
            price: true, 
            name: true,
            modifierGroup: {
              select: { 
                required: true, 
                multiSelect: true,
                minSelect: true,
                maxSelect: true
              }
            }
          }
        });

        if (modifiers.length !== item.modifiers.length) {
          const missingModifiers = item.modifiers.filter(
            modId => !modifiers.find(mod => mod.id === modId)
          );
          throw new ModifierNotAvailableError(missingModifiers[0]);
        }

        // Validate modifier group rules
        for (const modifier of modifiers) {
          modifierTotal += Number(modifier.price);
          processedModifiers.push({
            modifier: { connect: { id: modifier.id } },
            price: formatPriceNumber(modifier.price)
          });
        }
      }

      // Calculate item total
      const itemPrice = Number(menuItem.price);
      const itemTotal = (itemPrice + modifierTotal) * item.quantity;
      totalAmount += itemTotal;

      processedOrderItems.push({
        quantity: item.quantity,
        price: formatPriceNumber(itemPrice),
        notes: item.notes?.trim() || null,
        menuItem: { connect: { id: item.menuItemId } },
        modifiers: processedModifiers.length > 0 ? {
          create: processedModifiers
        } : undefined
      });
    }

    // 4. Validate order total - now throws specific error
    if (totalAmount < 1.00) {
      throw new OrderValueError(`Order total must be at least €1.00`, totalAmount);
    }
    if (totalAmount > 5000.00) {
      throw new OrderValueError(`Order total cannot exceed €5000.00`, totalAmount);
    }

    // 5. Create the order
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${uuidv4().split("-")[0].toUpperCase()}`;
    
    const order = await tx.order.create({
      data: {
        orderNumber,
        status: "PENDING",
        paymentStatus: "PENDING",
        notes: data.notes?.trim() || null,
        totalAmount: formatPriceNumber(totalAmount),
        table: { connect: { id: data.tableId } },
        restaurant: { connect: { id: data.restaurantId } },
        orderItems: {
          create: processedOrderItems
        }
      },
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true }
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
      }
    });

    // 6. Audit logging
    OrderAuditLogger.logOrderCreation(
      order.id,
      data.restaurantId,
      data.tableId,
      totalAmount,
      data.orderItems.length,
      requestId,
      clientIP
    );

    return order;
  });
};

export const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: {
          menuItem: {
            select: { id: true, name: true, price: true, description: true }
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
    }
  });

  return order;
};

export const getOrdersByRestaurant = async (
  restaurantId: string, 
  query: GetOrdersQuery = { limit: 20, offset: 0 }
) => {
  const where: any = { restaurantId };

  // Build dynamic filters
  if (query.status) {
    where.status = query.status;
  }

  if (query.tableId) {
    where.tableId = query.tableId;
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) {
      where.createdAt.gte = new Date(query.from);
    }
    if (query.to) {
      where.createdAt.lte = new Date(query.to);
    }
  }

  // Get orders with total count for pagination
  const [orders, totalCount] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: query.limit,
      skip: query.offset,
      include: {
        table: {
          select: { id: true, number: true, code: true }
        },
        orderItems: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true }
            },
            modifiers: {
              include: { 
                modifier: {
                  select: { id: true, name: true, price: true }
                }
              }
            }
          }
        }
      }
    }),
    prisma.order.count({ where })
  ]);

  return { orders, totalCount };
};

export const updateOrderStatus = async (
  id: string, 
  data: UpdateOrderStatusInput,
  staffId?: string,
  staffRole?: string,
  requestId?: string
) => {
  return await prisma.$transaction(async (tx) => {
    // Get current order
    const currentOrder = await tx.order.findUnique({
      where: { id },
      select: { 
        id: true, 
        status: true, 
        restaurantId: true,
        orderNumber: true
      }
    });

    if (!currentOrder) {
      throw new ResourceNotFoundError('Order', id);
    }

    // Validate status transition - using validation class
    OrderValidation.validateOrderStatusTransition(currentOrder.status, data.status);

    // Prepare update data
    const updateData: any = {
      status: data.status,
      updatedAt: new Date()
    };

    if (data.estimatedTime) {
      updateData.estimatedTime = data.estimatedTime;
    }

    if (data.notes) {
      updateData.statusNotes = data.notes.trim();
    }

    // Update order
    const updatedOrder = await tx.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            menuItem: {
              select: { id: true, name: true, price: true }
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
      }
    });

    // Audit logging
    OrderAuditLogger.logStatusChange(
      id,
      currentOrder.restaurantId,
      currentOrder.status,
      data.status,
      staffId,
      staffRole,
      data.estimatedTime,
      requestId
    );

    return updatedOrder;
  });
};

// Additional utility functions
export const getOrderStatistics = async (restaurantId: string, days: number = 7) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const stats = await prisma.order.groupBy({
    by: ['status'],
    where: {
      restaurantId,
      createdAt: { gte: since }
    },
    _count: { status: true },
    _sum: { totalAmount: true }
  });

  return stats;
};

export const getActiveOrdersCount = async (restaurantId: string) => {
  return await prisma.order.count({
    where: {
      restaurantId,
      status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] }
    }
  });
};