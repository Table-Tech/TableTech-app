// src/services/order.service.ts
import { Order, Prisma, OrderStatus, TableStatus } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';
import { randomBytes } from 'crypto';

// Order with full relations for responses
type OrderWithRelations = Omit<Order, 'orderItems'> & {
  orderItems: Array<{
    id: string;
    quantity: number;
    price: Prisma.Decimal;
    notes: string | null;
    menuItem: {
      id: string;
      name: string;
      price: Prisma.Decimal;
    };
    modifiers?: Array<{
      modifier: {
        id: string;
        name: string;
        price: Prisma.Decimal;
      };
    }>;
  }>;
  table: {
    id: string;
    number: number;
    code: string;
  };
  restaurant: {
    id: string;
    name: string;
  };
};

export class OrderService extends BaseService<Prisma.OrderCreateInput, Order> {
  protected model = 'order' as const;

  /**
   * Create order with transaction
   */
  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return await this.prisma.$transaction(async (tx) => {
      // Generate unique order number
      const orderNumber = await this.generateOrderNumber(tx);
      
      // Create the order
      const order = await tx.order.create({
        data: {
          ...data,
          orderNumber,
          status: "PENDING",
          paymentStatus: "PENDING"
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

      return order;
    });
  }

  /**
   * Find orders by restaurant with optional filtering
   */
  async findByRestaurant(
    restaurantId: string,
    options: {
      status?: OrderStatus;
      tableId?: string;
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ orders: OrderWithRelations[]; total: number }> {
    const where: any = { restaurantId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.tableId) {
      where.tableId = options.tableId;
    }

    if (options.from || options.to) {
      where.createdAt = {};
      if (options.from) where.createdAt.gte = options.from;
      if (options.to) where.createdAt.lte = options.to;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({ 
        where,
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
        },
        orderBy: { createdAt: 'desc' },
        take: options.limit || 20,
        skip: options.offset || 0
      }),
      this.prisma.order.count({ where })
    ]);

    return { orders, total };
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string
  ): Promise<OrderWithRelations> {
    return await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          status: newStatus,
          notes: notes || undefined,
          updatedAt: new Date()
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

      return updatedOrder;
    });
  }

  /**
   * Update table status
   */
  async updateTableStatus(tableId: string, status: TableStatus): Promise<void> {
    await this.prisma.table.update({
      where: { id: tableId },
      data: { status }
    });
  }

  /**
   * Get order statistics for a restaurant
   */
  async getStatistics(restaurantId: string, days: number = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [statusStats, totalRevenue, orderCount] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        where: {
          restaurantId,
          createdAt: { gte: since }
        },
        _count: { status: true },
        _sum: { totalAmount: true }
      }),
      this.prisma.order.aggregate({
        where: {
          restaurantId,
          createdAt: { gte: since },
          status: 'COMPLETED'
        },
        _sum: { totalAmount: true }
      }),
      this.prisma.order.count({
        where: {
          restaurantId,
          createdAt: { gte: since }
        }
      })
    ]);

    return {
      period: `${days} days`,
      totalOrders: orderCount,
      totalRevenue: Number(totalRevenue._sum.totalAmount || 0),
      statusBreakdown: statusStats,
      averageOrderValue: orderCount > 0 
        ? Number(totalRevenue._sum.totalAmount || 0) / orderCount 
        : 0
    };
  }

  /**
   * Get active orders count for a restaurant
   */
  async getActiveOrdersCount(restaurantId: string): Promise<number> {
    return this.prisma.order.count({
      where: {
        restaurantId,
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] }
      }
    });
  }

  /**
   * Override findById to include relations
   */
  async findById(id: string): Promise<OrderWithRelations | null> {
    return await this.prisma.order.findUnique({
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
        },
        restaurant: {
          select: { id: true, name: true }
        }
      }
    });
  }

  /**
   * Generate unique order number
   */
  private async generateOrderNumber(tx: any): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
      
      const existing = await tx.order.findUnique({
        where: { orderNumber },
        select: { id: true }
      });

      if (!existing) {
        return orderNumber;
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, 1));
    }

    throw new ApiError(500, 'ORDER_NUMBER_GENERATION_FAILED', 'Failed to generate unique order number');
  }
}