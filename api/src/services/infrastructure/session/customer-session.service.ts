import { PrismaClient } from '@prisma/client';
import { redisService } from '../redis/redis.service.js';
import { ApiError } from '../../../types/errors.js';
import { logger } from '../../../utils/logger.js';
import crypto from 'crypto';

export interface CreateSessionDTO {
  tableCode: string;
  customerName?: string;
  customerEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  // GDPR compliance
  acceptedPrivacyPolicy?: boolean;
  consentToDataProcessing?: boolean;
}

export interface CustomerSession {
  sessionId: string;
  sessionToken: string;
  tableId: string;
  tableNumber: number;
  restaurantId: string;
  restaurantName: string;
  customerName?: string;
  expiresAt: Date;
  createdAt: Date;
}

export class CustomerSessionService {
  private prisma: PrismaClient;
  private readonly SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
  private readonly REDIS_TTL = 2 * 60 * 60; // 2 hours in seconds

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create new customer session when QR code is scanned
   */
  async createSession(data: CreateSessionDTO): Promise<CustomerSession> {
    try {
      // 1. Validate table exists and is available
      const table = await this.prisma.table.findUnique({
        where: { code: data.tableCode },
        include: { 
          restaurant: { select: { id: true, name: true } }
        }
      });

      if (!table) {
        throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
      }

      if (table.status === 'MAINTENANCE') {
        throw new ApiError(400, 'TABLE_UNAVAILABLE', 'Table is under maintenance');
      }

      // 2. Generate session ID and token
      const sessionId = crypto.randomUUID();
      const sessionToken = `sess_${crypto.randomUUID().replace(/-/g, '')}`;
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

      // 3. Create session in database (GDPR compliant - no IP collection)
      const session = await this.prisma.customerSession.create({
        data: {
          sessionId,
          tableId: table.id,
          // Skip IP/userAgent collection for GDPR compliance
          ipAddress: null,
          userAgent: null,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          expiresAt
        }
      });

      // 4. Store in Redis for fast access
      const redisData = {
        sessionId,
        tableId: table.id,
        tableNumber: table.number,
        restaurantId: table.restaurant.id,
        restaurantName: table.restaurant.name,
        customerName: data.customerName,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        orders: []
      };

      await redisService.set(
        `session:${sessionToken}`,
        redisData,
        this.REDIS_TTL
      );

      // 5. Log session creation
      logger.customer.sessionStarted(null as any, sessionToken);

      return {
        sessionId,
        sessionToken,
        tableId: table.id,
        tableNumber: table.number,
        restaurantId: table.restaurant.id,
        restaurantName: table.restaurant.name,
        customerName: data.customerName,
        expiresAt,
        createdAt: session.createdAt
      };

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'customer-session',
        operation: 'createSession',
        tableCode: data.tableCode
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'SESSION_CREATION_FAILED', 'Failed to create session');
    }
  }

  /**
   * Validate and get session data
   */
  async validateSession(sessionToken: string): Promise<CustomerSession> {
    try {
      // 1. Check Redis cache first (fast)
      let sessionData = await redisService.get(`session:${sessionToken}`);

      if (!sessionData) {
        // 2. Check database (slower fallback)
        const dbSession = await this.prisma.customerSession.findFirst({
          where: {
            sessionId: sessionToken.replace('sess_', ''),
            isActive: true,
            expiresAt: { gt: new Date() }
          },
          include: {
            table: {
              include: {
                restaurant: { select: { id: true, name: true } }
              }
            }
          }
        });

        if (!dbSession) {
          throw new ApiError(401, 'INVALID_SESSION', 'Session not found or expired');
        }

        // Rebuild Redis cache
        sessionData = {
          sessionId: dbSession.sessionId,
          tableId: dbSession.tableId,
          tableNumber: dbSession.table.number,
          restaurantId: dbSession.table.restaurant.id,
          restaurantName: dbSession.table.restaurant.name,
          customerName: dbSession.customerName,
          createdAt: dbSession.createdAt,
          expiresAt: dbSession.expiresAt,
          orders: []
        };

        await redisService.set(
          `session:${sessionToken}`,
          sessionData,
          this.REDIS_TTL
        );
      }

      // 3. Check expiration
      if (new Date(sessionData.expiresAt) < new Date()) {
        await this.expireSession(sessionToken);
        throw new ApiError(401, 'SESSION_EXPIRED', 'Session has expired');
      }

      // 4. Update last active time
      await this.updateLastActive(sessionToken);

      return {
        sessionToken,
        ...sessionData
      };

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'SESSION_VALIDATION_FAILED', 'Failed to validate session');
    }
  }

  /**
   * Update session activity timestamp
   */
  async updateLastActive(sessionToken: string): Promise<void> {
    try {
      const now = new Date();

      // Update Redis
      const sessionData = await redisService.get(`session:${sessionToken}`);
      if (sessionData) {
        sessionData.lastActiveAt = now;
        await redisService.set(`session:${sessionToken}`, sessionData, this.REDIS_TTL);
      }

      // Update database (less frequently - every 5 minutes)
      const sessionId = sessionToken.replace('sess_', '');
      await this.prisma.customerSession.updateMany({
        where: {
          sessionId,
          isActive: true,
          // Only update if last update was more than 5 minutes ago
          lastActiveAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }
        },
        data: { lastActiveAt: now }
      });

    } catch (error) {
      // Don't throw on activity update failures
      logger.error.log(error as Error, {
        service: 'customer-session',
        operation: 'updateLastActive',
        sessionToken
      });
    }
  }

  /**
   * Add order to session tracking
   */
  async addOrderToSession(sessionToken: string, orderId: string): Promise<void> {
    try {
      const sessionData = await redisService.get(`session:${sessionToken}`);
      if (sessionData) {
        if (!sessionData.orders) {
          sessionData.orders = [];
        }
        sessionData.orders.push(orderId);
        await redisService.set(`session:${sessionToken}`, sessionData, this.REDIS_TTL);
      }
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'customer-session',
        operation: 'addOrderToSession',
        sessionToken,
        orderId
      });
    }
  }

  /**
   * Get session orders
   */
  async getSessionOrders(sessionToken: string): Promise<any[]> {
    try {
      const session = await this.validateSession(sessionToken);
      
      return await this.prisma.order.findMany({
        where: {
          tableId: session.tableId,
          createdAt: { gte: session.createdAt }
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

    } catch (error) {
      throw new ApiError(500, 'FAILED_TO_GET_ORDERS', 'Failed to get session orders');
    }
  }

  /**
   * Expire session manually
   */
  async expireSession(sessionToken: string): Promise<void> {
    try {
      // Remove from Redis
      await redisService.del(`session:${sessionToken}`);

      // Mark as inactive in database
      const sessionId = sessionToken.replace('sess_', '');
      await this.prisma.customerSession.updateMany({
        where: { sessionId },
        data: { isActive: false }
      });

      logger.base.info({
        category: 'CUSTOMER',
        event: 'SESSION_EXPIRED',
        sessionToken
      }, 'Customer session expired');

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'customer-session',
        operation: 'expireSession',
        sessionToken
      });
    }
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.prisma.customerSession.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        data: { isActive: false }
      });

      logger.base.info({
        category: 'SYSTEM',
        event: 'SESSION_CLEANUP',
        count: result.count
      }, `Cleaned up ${result.count} expired sessions`);

      return result.count;

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'customer-session',
        operation: 'cleanupExpiredSessions'
      });
      return 0;
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionToken: string): Promise<Date> {
    try {
      const newExpiresAt = new Date(Date.now() + this.SESSION_DURATION);

      // Update Redis
      const sessionData = await redisService.get(`session:${sessionToken}`);
      if (sessionData) {
        sessionData.expiresAt = newExpiresAt;
        await redisService.set(`session:${sessionToken}`, sessionData, this.REDIS_TTL);
      }

      // Update database
      const sessionId = sessionToken.replace('sess_', '');
      await this.prisma.customerSession.updateMany({
        where: { sessionId, isActive: true },
        data: { expiresAt: newExpiresAt }
      });

      return newExpiresAt;

    } catch (error) {
      throw new ApiError(500, 'FAILED_TO_EXTEND_SESSION', 'Failed to extend session');
    }
  }
}