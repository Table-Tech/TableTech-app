// api/src/services/websocket/websocket.service.ts
import { Server as SocketServer, Socket } from 'socket.io';
import { Server } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { verifyToken } from '../../../utils/jwt.js';
import { ApiError } from '../../../types/errors.js';
import { logger } from '../../../utils/logger.js';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { PrismaClient } from '@prisma/client';

export class WebSocketService {
  private io: SocketServer;
  private pubClient: Redis;
  private subClient: Redis;
  private redisClient: Redis;
  private rateLimiter: RateLimiterRedis;
  private prisma: PrismaClient;
  
  // Track active connections for monitoring
  private connections = new Map<string, {
    socketId: string;
    userId?: string;
    restaurantId: string;
    role: string;
    connectedAt: Date;
  }>();

  constructor(server: Server, prisma: PrismaClient) {
    this.prisma = prisma;
    
    // Initialize Redis clients
    this.pubClient = new Redis(process.env.REDIS_URL!);
    this.subClient = this.pubClient.duplicate();
    this.redisClient = this.pubClient.duplicate();

    // Rate limiter to prevent spam
    this.rateLimiter = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'ws_rl',
      points: 100, // Number of events
      duration: 60, // Per 60 seconds
    });

    // Initialize Socket.io with Redis adapter for scaling
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL?.split(',') || ['http://localhost:3000', 'http://localhost:3002'], // Support multiple frontends
        credentials: true
      },
      // Important: these settings prevent memory leaks and improve reliability
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling'], // WebSocket first, polling fallback
      allowEIO3: true // Backwards compatibility
    });

    // Use Redis adapter for horizontal scaling
    this.io.adapter(createAdapter(this.pubClient, this.subClient));

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupCleanupHandlers();
    
    logger.system.start('WebSocket');
  }

  /**
   * Authentication middleware - runs before connection established
   */
  private setupMiddleware() {
    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        const userType = socket.handshake.query.type as string; // 'staff' or 'customer'

        if (userType === 'staff') {
          // Staff authentication via JWT
          if (!token) {
            return next(new Error('Authentication required'));
          }

          const payload = verifyToken(token);
          socket.data.user = payload;
          socket.data.userType = 'staff';
          socket.data.restaurantId = payload.restaurantId;
          
        } else if (userType === 'customer') {
          // Customer authentication via table code
          const { tableCode, sessionId } = socket.handshake.query;
          
          if (!tableCode || !sessionId) {
            return next(new Error('Table code and session required'));
          }

          // Verify table exists and is active
          const table = await this.prisma.table.findUnique({
            where: { code: tableCode as string },
            include: { restaurant: { select: { id: true } } }
          });

          if (!table || table.status === 'MAINTENANCE') {
            return next(new Error('Invalid or unavailable table'));
          }

          socket.data.userType = 'customer';
          socket.data.tableId = table.id;
          socket.data.tableCode = table.code;
          socket.data.restaurantId = table.restaurant.id;
          socket.data.sessionId = sessionId;
          
        } else {
          return next(new Error('Invalid connection type'));
        }

        next();
      } catch (error) {
        logger.base.warn({
          category: 'SECURITY',
          event: 'WEBSOCKET_AUTH_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error'
        }, 'WebSocket authentication failed');
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Main event handlers
   */
  private setupEventHandlers() {
    this.io.on('connection', async (socket: Socket) => {
      const connectionInfo = {
        socketId: socket.id,
        userId: socket.data.user?.staffId,
        restaurantId: socket.data.restaurantId,
        role: socket.data.user?.role || 'customer',
        connectedAt: new Date()
      };

      this.connections.set(socket.id, connectionInfo);
      
      // Join appropriate rooms based on user type
      await this.handleConnection(socket);

      // Setup event listeners
      this.setupOrderEvents(socket);
      this.setupTableEvents(socket);
      this.setupKitchenEvents(socket);
      
      // Handle disconnection
      socket.on('disconnect', (reason) => {
        this.handleDisconnection(socket, reason);
      });

      // Error handling
      socket.on('error', (error) => {
        logger.error.log(error, { socketId: socket.id });
      });
    });
  }

  /**
   * Handle new connections and room assignments
   */
  private async handleConnection(socket: Socket) {
    const { userType, restaurantId, user, tableId } = socket.data;

    // Restaurant-wide room (all staff can receive updates)
    socket.join(`restaurant:${restaurantId}`);

    if (userType === 'staff') {
      // Role-based rooms for targeted updates
      socket.join(`restaurant:${restaurantId}:staff`);
      socket.join(`restaurant:${restaurantId}:role:${user.role}`);
      
      // Kitchen display room
      if (['CHEF', 'MANAGER', 'ADMIN'].includes(user.role)) {
        socket.join(`restaurant:${restaurantId}:kitchen`);
      }

      // Notify other staff of new connection
      socket.to(`restaurant:${restaurantId}:staff`).emit('staff:connected', {
        staffId: user.staffId,
        name: user.name,
        role: user.role
      });

      // Send current restaurant state
      await this.syncRestaurantState(socket);
      
    } else if (userType === 'customer') {
      // Table-specific room
      socket.join(`table:${tableId}`);
      
      // Send current order status for this table
      await this.syncTableOrders(socket);
    }

    // Log connection
    logger.base.info({
      category: 'SYSTEM',
      event: 'WEBSOCKET_CONNECTED',
      socketId: socket.id,
      userType,
      restaurantId,
      role: user?.role
    }, 'WebSocket client connected');
  }

  /**
   * Order-related events
   */
  private setupOrderEvents(socket: Socket) {
    // Kitchen acknowledges seeing new order
    socket.on('order:acknowledge', async (orderId: string, callback) => {
      try {
        await this.rateLimiter.consume(socket.id);
        
        // Verify staff has permission
        if (!['CHEF', 'MANAGER', 'ADMIN'].includes(socket.data.user?.role)) {
          return callback({ error: 'Insufficient permissions' });
        }

        // Update order status
        const order = await this.prisma.order.update({
          where: { 
            id: orderId,
            restaurantId: socket.data.restaurantId // Security: ensure same restaurant
          },
          data: { 
            status: 'CONFIRMED'
            // TODO: Add confirmedAt, confirmedBy, readyAt fields to Order schema
          },
          include: { 
            table: true,
            orderItems: { include: { menuItem: true } }
          }
        });

        // Notify all relevant parties
        this.io.to(`restaurant:${socket.data.restaurantId}:kitchen`).emit('order:confirmed', {
          orderId,
          confirmedBy: socket.data.user.name,
          timestamp: new Date()
        });

        this.io.to(`table:${order.tableId}`).emit('order:status:changed', {
          orderId,
          status: 'CONFIRMED',
          message: 'Your order has been confirmed by the kitchen'
        });

        callback({ success: true });
        
      } catch (error) {
        logger.error.log(error as Error, { event: 'order:acknowledge', orderId });
        callback({ error: 'Failed to acknowledge order' });
      }
    });

    // Update order item status (for kitchen display)
    socket.on('order:item:status', async (data: {
      orderId: string;
      itemId: string;
      status: 'PREPARING' | 'READY';
    }, callback) => {
      try {
        await this.rateLimiter.consume(socket.id);

        // Complex status update with business logic
        await this.updateOrderItemStatus(socket, data);
        
        callback({ success: true });
      } catch (error) {
        callback({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });

    // Kitchen marks order ready
    socket.on('order:ready', async (orderId: string, callback) => {
      try {
        const order = await this.prisma.order.update({
          where: { 
            id: orderId,
            restaurantId: socket.data.restaurantId
          },
          data: { 
            status: 'READY'
            // TODO: Add readyAt field to Order schema
          },
          include: { table: true }
        });

        // Notify waiters
        this.io.to(`restaurant:${socket.data.restaurantId}:role:WAITER`).emit('order:ready:pickup', {
          orderId,
          tableNumber: order.table.number,
          orderNumber: order.orderNumber
        });

        // Notify customer
        this.io.to(`table:${order.tableId}`).emit('order:ready', {
          orderId,
          message: 'Your order is ready!'
        });

        // Play sound in kitchen display
        socket.emit('kitchen:play:sound', 'order-ready');

        callback({ success: true });
      } catch (error) {
        callback({ error: 'Failed to mark order ready' });
      }
    });
  }

  /**
   * Table management events
   */
  private setupTableEvents(socket: Socket) {
    // Request assistance
    socket.on('table:assistance', async (data: { 
      type: 'waiter' | 'bill' | 'other';
      message?: string;
    }, callback) => {
      try {
        if (socket.data.userType !== 'customer') {
          return callback({ error: 'Only customers can request assistance' });
        }

        // TODO: Add TableAssistance model to schema
        // For now, just notify waiters directly
        const table = await this.prisma.table.findUnique({
          where: { id: socket.data.tableId },
          select: { number: true }
        });

        // Notify waiters with sound
        this.io.to(`restaurant:${socket.data.restaurantId}:role:WAITER`).emit('table:assistance:request', {
          tableId: socket.data.tableId,
          tableNumber: table?.number,
          type: data.type,
          message: data.message,
          urgent: data.type === 'bill'
        });

        callback({ success: true });
      } catch (error) {
        callback({ error: 'Failed to request assistance' });
      }
    });

    // Staff updates table status
    socket.on('table:status:update', async (data: {
      tableId: string;
      status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
    }, callback) => {
      try {
        // Verify permissions
        if (!socket.data.user || socket.data.userType !== 'staff') {
          return callback({ error: 'Unauthorized' });
        }

        const table = await this.prisma.table.update({
          where: { 
            id: data.tableId,
            restaurantId: socket.data.restaurantId
          },
          data: { status: data.status },
          include: { 
            _count: { 
              select: { 
                orders: {
                  where: {
                    status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
                  }
                }
              }
            }
          }
        });

        // Broadcast to all staff
        this.io.to(`restaurant:${socket.data.restaurantId}:staff`).emit('table:status:changed', {
          tableId: data.tableId,
          tableNumber: table.number,
          status: data.status,
          activeOrders: table._count.orders
        });

        callback({ success: true });
      } catch (error) {
        callback({ error: 'Failed to update table status' });
      }
    });
  }

  /**
   * Kitchen-specific events
   */
  private setupKitchenEvents(socket: Socket) {
    // Get kitchen statistics
    socket.on('kitchen:stats', async (callback) => {
      try {
        const stats = await this.getKitchenStatistics(socket.data.restaurantId);
        callback({ success: true, stats });
      } catch (error) {
        callback({ error: 'Failed to get statistics' });
      }
    });

    // Toggle item availability
    socket.on('menu:item:availability', async (data: {
      itemId: string;
      available: boolean;
      reason?: string;
    }, callback) => {
      try {
        // Only kitchen staff can update availability
        if (!['CHEF', 'MANAGER', 'ADMIN'].includes(socket.data.user?.role)) {
          return callback({ error: 'Insufficient permissions' });
        }

        const item = await this.prisma.menuItem.update({
          where: { 
            id: data.itemId,
            restaurantId: socket.data.restaurantId
          },
          data: { 
            isAvailable: data.available
            // TODO: Add availabilityNote field to MenuItem schema
          }
        });

        // Notify all connections about menu change
        this.io.to(`restaurant:${socket.data.restaurantId}`).emit('menu:item:availability:changed', {
          itemId: data.itemId,
          itemName: item.name,
          available: data.available,
          reason: data.reason
        });

        callback({ success: true });
      } catch (error) {
        callback({ error: 'Failed to update availability' });
      }
    });
  }

  /**
   * Sync current state when staff connects
   */
  private async syncRestaurantState(socket: Socket) {
    try {
      // Get active orders
      const activeOrders = await this.prisma.order.findMany({
        where: {
          restaurantId: socket.data.restaurantId,
          status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
        },
        include: {
          table: true,
          orderItems: {
            include: {
              menuItem: true,
              modifiers: { include: { modifier: true } }
            }
          }
        },
        orderBy: { createdAt: 'asc' }
      });

      // Get table statuses
      const tables = await this.prisma.table.findMany({
        where: { restaurantId: socket.data.restaurantId },
        include: {
          _count: {
            select: {
              orders: {
                where: {
                  status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] }
                }
              }
            }
          }
        }
      });

      // Send initial state
      socket.emit('restaurant:state:sync', {
        orders: activeOrders,
        tables: tables.map(t => ({
          id: t.id,
          number: t.number,
          status: t.status,
          activeOrders: t._count.orders
        })),
        timestamp: new Date()
      });

    } catch (error) {
      logger.error.log(error as Error, { event: 'syncRestaurantState' });
      socket.emit('sync:error', { message: 'Failed to sync restaurant state' });
    }
  }

  /**
   * Sync orders for customer table
   */
  private async syncTableOrders(socket: Socket) {
    try {
      const orders = await this.prisma.order.findMany({
        where: {
          tableId: socket.data.tableId,
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
        },
        include: {
          orderItems: {
            include: {
              menuItem: true,
              modifiers: { include: { modifier: true } }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      socket.emit('table:orders:sync', { orders });
    } catch (error) {
      socket.emit('sync:error', { message: 'Failed to sync orders' });
    }
  }

  /**
   * Handle disconnections
   */
  private handleDisconnection(socket: Socket, reason: string) {
    const connection = this.connections.get(socket.id);
    if (connection) {
      // Notify other staff if staff member disconnected
      if (socket.data.userType === 'staff') {
        socket.to(`restaurant:${connection.restaurantId}:staff`).emit('staff:disconnected', {
          staffId: connection.userId,
          reason
        });
      }

      // Log disconnection
      logger.base.info({
        category: 'SYSTEM',
        event: 'WEBSOCKET_DISCONNECTED',
        socketId: socket.id,
        reason,
        duration: Date.now() - connection.connectedAt.getTime()
      }, 'WebSocket client disconnected');

      this.connections.delete(socket.id);
    }
  }

  /**
   * Public method to emit order updates (called from OrderService)
   */
  public async emitNewOrder(order: any) {
    // Emit to kitchen displays
    this.io.to(`restaurant:${order.restaurantId}:kitchen`).emit('order:new', {
      order,
      notification: {
        title: `New Order #${order.orderNumber}`,
        body: `Table ${order.table.number} - ${order.orderItems.length} items`,
        priority: 'high',
        sound: 'new-order'
      }
    });

    // Emit to all staff
    this.io.to(`restaurant:${order.restaurantId}:staff`).emit('order:created', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.table.number,
      totalAmount: order.totalAmount,
      itemCount: order.orderItems.length
    });

    // Store in Redis for persistence
    await this.storeOrderInRedis(order);
  }

  /**
   * Emit order status updates
   */
  public async emitOrderStatusUpdate(order: any, previousStatus: string) {
    const updateData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: order.status,
      timestamp: new Date()
    };

    // Notify kitchen
    this.io.to(`restaurant:${order.restaurantId}:kitchen`).emit('order:status:updated', updateData);

    // Notify customer
    this.io.to(`table:${order.tableId}`).emit('order:status:changed', {
      ...updateData,
      message: this.getStatusMessage(order.status)
    });

    // Special handling for ready orders
    if (order.status === 'READY') {
      this.io.to(`restaurant:${order.restaurantId}:role:WAITER`).emit('order:ready:notification', {
        orderId: order.id,
        tableNumber: order.table.number,
        urgent: true
      });
    }
  }

  /**
   * Store order in Redis for recovery
   */
  private async storeOrderInRedis(order: any) {
    const key = `order:active:${order.restaurantId}:${order.id}`;
    await this.redisClient.setex(
      key,
      3600, // 1 hour TTL
      JSON.stringify({
        ...order,
        _stored: new Date()
      })
    );

    // Add to restaurant's active order set
    await this.redisClient.sadd(
      `restaurant:${order.restaurantId}:active_orders`,
      order.id
    );
  }

  /**
   * Update order item status with complex logic
   */
  private async updateOrderItemStatus(socket: Socket, data: any) {
    const { orderId, itemId, status } = data;

    await this.prisma.$transaction(async (tx) => {
      // Update item status
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: { status }
      });

      // Check if all items are ready
      const allItems = await tx.orderItem.findMany({
        where: { orderId }
      });

      const allReady = allItems.every(item => 
        item.status === 'READY' || item.status === 'DELIVERED'
      );

      // Update order status if all items ready
      if (allReady) {
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'READY' }
        });

        // Emit order ready notification
        this.io.to(`restaurant:${socket.data.restaurantId}:role:WAITER`).emit('order:ready:notification', {
          orderId,
          urgent: true
        });
      }

      // Emit item status update
      this.io.to(`restaurant:${socket.data.restaurantId}:kitchen`).emit('order:item:updated', {
        orderId,
        itemId,
        status,
        allItemsReady: allReady
      });
    });
  }

  /**
   * Get kitchen statistics
   */
  private async getKitchenStatistics(restaurantId: string) {
    const [pendingOrders, preparingOrders, avgPrepTime] = await Promise.all([
      this.prisma.order.count({
        where: { restaurantId, status: 'PENDING' }
      }),
      this.prisma.order.count({
        where: { restaurantId, status: 'PREPARING' }
      }),
      this.calculateAveragePrepTime(restaurantId)
    ]);

    return {
      pendingOrders,
      preparingOrders,
      avgPrepTime,
      connectedStaff: Array.from(this.connections.values())
        .filter(c => c.restaurantId === restaurantId && c.role !== 'customer')
        .length
    };
  }

  /**
   * Calculate average preparation time
   */
  private async calculateAveragePrepTime(restaurantId: string): Promise<number> {
    const recentOrders = await this.prisma.order.findMany({
      where: {
        restaurantId,
        status: 'COMPLETED',
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    if (recentOrders.length === 0) return 0;

    const totalTime = recentOrders.reduce((sum, order) => {
      const prep = order.updatedAt.getTime() - order.createdAt.getTime();
      return sum + prep;
    }, 0);

    return Math.round(totalTime / recentOrders.length / 1000 / 60); // Minutes
  }

  /**
   * Cleanup and monitoring
   */
  private setupCleanupHandlers() {
    // Clean up stale Redis entries every hour
    setInterval(async () => {
      try {
        const restaurants = await this.prisma.restaurant.findMany({
          select: { id: true }
        });

        for (const restaurant of restaurants) {
          const activeOrderIds = await this.redisClient.smembers(
            `restaurant:${restaurant.id}:active_orders`
          );

          for (const orderId of activeOrderIds) {
            const order = await this.prisma.order.findUnique({
              where: { id: orderId },
              select: { status: true }
            });

            if (!order || ['COMPLETED', 'CANCELLED'].includes(order.status)) {
              await this.redisClient.srem(
                `restaurant:${restaurant.id}:active_orders`,
                orderId
              );
              await this.redisClient.del(`order:active:${restaurant.id}:${orderId}`);
            }
          }
        }
      } catch (error) {
        logger.error.log(error as Error, { event: 'cleanup_failed' });
      }
    }, 60 * 60 * 1000);

    // Monitor connection health
    setInterval(() => {
      const stats = {
        totalConnections: this.connections.size,
        byRole: {} as Record<string, number>,
        byRestaurant: {} as Record<string, number>
      };

      Array.from(this.connections.values()).forEach(conn => {
        stats.byRole[conn.role] = (stats.byRole[conn.role] || 0) + 1;
        stats.byRestaurant[conn.restaurantId] = 
          (stats.byRestaurant[conn.restaurantId] || 0) + 1;
      });

      // Only log if there are active connections
      if (stats.totalConnections > 0) {
        logger.base.debug({
          category: 'PERFORMANCE',
          event: 'WEBSOCKET_STATS',
          ...stats
        }, 'WebSocket connection statistics');
      }
    }, 2 * 60 * 1000); // Every 2 minutes instead of 30 seconds
  }

  /**
   * Get status message for customers
   */
  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      CONFIRMED: 'Your order has been confirmed and will be prepared soon',
      PREPARING: 'Your order is being prepared',
      READY: 'Your order is ready!',
      DELIVERED: 'Enjoy your meal!',
      COMPLETED: 'Thank you for your order',
      CANCELLED: 'Your order has been cancelled'
    };
    return messages[status] || 'Order status updated';
  }

  /**
   * Graceful shutdown
   */
  public async shutdown() {
    // Notify all clients
    this.io.emit('server:shutdown', { 
      message: 'Server is restarting, you will be reconnected automatically' 
    });

    // Close all connections
    this.io.disconnectSockets(true);

    // Close Redis connections
    await Promise.all([
      this.pubClient.quit(),
      this.subClient.quit(),
      this.redisClient.quit()
    ]);

    logger.system.stop('WebSocket service shutdown');
  }
}