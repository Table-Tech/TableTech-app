// src/services/order.service.ts
import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { formatPrice } from "../utils/price.js";
import { BusinessLogicError, ResourceNotFoundError } from "../types/errors.js";

const prisma = new PrismaClient();

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

export const createOrder = async (data: CreateOrderInput) => {
  // Validate table exists and belongs to restaurant
  const table = await prisma.table.findFirst({
    where: { 
      id: data.tableId, 
      restaurantId: data.restaurantId 
    }
  });
  
  if (!table) {
    throw new ResourceNotFoundError('Table', data.tableId);
  }

  // Calculate total amount by fetching prices from database
  let totalAmount = 0;
  const processedOrderItems = [];

  for (const item of data.orderItems) {
    // Get menu item with price - ensure it belongs to the restaurant
    const menuItem = await prisma.menuItem.findFirst({
      where: { 
        id: item.menuItemId,
        restaurantId: data.restaurantId,
        isAvailable: true
      },
      select: { id: true, price: true, name: true }
    });

    if (!menuItem) {
      throw new ResourceNotFoundError('Menu item', item.menuItemId);
    }

    // Get modifier prices if any - ensure they belong to the restaurant
    let modifierTotal = 0;
    const processedModifiers = [];

    if (item.modifiers && item.modifiers.length > 0) {
      const modifiers = await prisma.modifier.findMany({
        where: { 
          id: { in: item.modifiers },
          restaurantId: data.restaurantId,
          isAvailable: true
        },
        select: { id: true, price: true, name: true }
      });

      if (modifiers.length !== item.modifiers.length) {
        throw new BusinessLogicError('Some modifiers are not available', 'INVALID_MODIFIERS');
      }

      for (const modifier of modifiers) {
        modifierTotal += Number(modifier.price);
        processedModifiers.push({
          modifier: { connect: { id: modifier.id } },
          price: modifier.price
        });
      }
    }

    // Calculate item total: (menu item price + modifier prices) * quantity
    const itemPrice = Number(menuItem.price);
    const itemTotal = (itemPrice + modifierTotal) * item.quantity;
    totalAmount += itemTotal;

    // Prepare order item data
    processedOrderItems.push({
      quantity: item.quantity,
      price: itemPrice, // Store the base menu item price
      notes: item.notes,
      menuItem: { connect: { id: item.menuItemId } },
      modifiers: processedModifiers.length > 0 ? {
        create: processedModifiers
      } : undefined
    });
  }

  // Create the order with calculated total
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${uuidv4().split("-")[0]}`,
      status: "PENDING",
      paymentStatus: "PENDING",
      notes: data.notes,
      totalAmount: formatPrice(totalAmount), // Format to 2 decimals
      table: { connect: { id: data.tableId } },
      restaurant: { connect: { id: data.restaurantId } },
      orderItems: {
        create: processedOrderItems.map(item => ({
          ...item,
          price: formatPrice(item.price), // Format item price
          modifiers: item.modifiers ? {
            create: item.modifiers.create.map(mod => ({
              ...mod,
              price: formatPrice(mod.price) // Format modifier price
            }))
          } : undefined
        }))
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
      }
    }
  });

  return order;
};

export const getOrderById = async (id: string) => {
  const order = await prisma.order.findUnique({
    where: { id },
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
      }
    }
  });

  return order;
};

export const getOrdersByRestaurant = async (restaurantId: string, query: GetOrdersQuery = { limit: 50, offset: 0 }) => {
  // Build dynamic where clause
  const where: any = { restaurantId };

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

  const orders = await prisma.order.findMany({
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
  });

  return orders;
};

export const updateOrderStatus = async (id: string, data: UpdateOrderStatusInput) => {
  const updateData: any = {
    status: data.status,
    updatedAt: new Date()
  };

  if (data.estimatedTime) {
    updateData.estimatedTime = data.estimatedTime;
  }

  if (data.notes) {
    updateData.statusNotes = data.notes;
  }

  try {
    const order = await prisma.order.update({
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
        }
      }
    });

    return order;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      throw new ResourceNotFoundError('Order', id);
    }
    throw error;
  }
};