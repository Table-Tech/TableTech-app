import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../types/errors.js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { redisService } from '../services/infrastructure/redis/redis.service.js';

/**
 * Prevent duplicate orders (double-click protection) using Redis
 */
export function preventDuplicateOrders(windowMs: number = 5000) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    let key: string;
    
    // Different keys for staff vs customer
    if ((req as any).user) {
      const user = (req as AuthenticatedRequest).user;
      key = `staff:${user.staffId}`;
    } else {
      // For customers, use IP + table code
      const body = req.body as any;
      key = `customer:${req.ip}:${body.tableCode || 'unknown'}`;
    }

    const now = Date.now();
    const lastOrderTime = await redisService.getRecentOrder(key);
    
    if (lastOrderTime && now - lastOrderTime < windowMs) {
      const waitSeconds = Math.ceil((windowMs - (now - lastOrderTime)) / 1000);
      throw new ApiError(
        429,
        'DUPLICATE_ORDER',
        `Please wait ${waitSeconds} seconds before placing another order`
      );
    }
    
    await redisService.setRecentOrder(key, now, windowMs);
  };
}

/**
 * Enhanced rate limiting for order creation using Redis
 */
export function orderRateLimit(
  maxOrders: number, 
  windowMs: number,
  keyPrefix: string = 'order'
) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    let key: string;
    
    if ((req as any).user) {
      const user = (req as AuthenticatedRequest).user;
      key = `staff:${user.staffId}`;
    } else {
      key = `customer:${req.ip}`;
    }

    try {
      const rateLimiter = redisService.getRateLimiter(`${keyPrefix}_rate_limit`, {
        points: maxOrders,
        duration: Math.ceil(windowMs / 1000), // Convert to seconds
      });

      await rateLimiter.consume(key);
    } catch (rejRes: any) {
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 1;
      reply.header('Retry-After', retryAfter.toString());
      
      throw new ApiError(
        429,
        'ORDER_RATE_LIMIT',
        `Too many orders. Try again in ${retryAfter} seconds`
      );
    }
  };
}

/**
 * Log order attempts for security audit
 */
export function auditOrderAttempt() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const body = req.body as any;
    const user = (req as any).user;
    
    const auditLog = {
      type: user ? 'staff_order' : 'customer_order',
      staffId: user?.staffId,
      restaurantId: user?.restaurantId || body.restaurantId,
      tableId: body.tableId,
      tableCode: body.tableCode,
      itemCount: body.items?.length || 0,
      orderValue: body.totalAmount,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    };

    // Log for security monitoring
    req.log.info(auditLog, 'Order attempt');
    
    // Send to security monitoring via logger
    if (auditLog.type === 'customer_order' && auditLog.itemCount > 20) {
      // Flag large customer orders for review
      req.log.warn({
        ...auditLog,
        category: 'SECURITY',
        event: 'LARGE_CUSTOMER_ORDER',
        severity: 'MEDIUM'
      }, `Large customer order detected: ${auditLog.itemCount} items`);
    }
    
    if (auditLog.orderValue && auditLog.orderValue > 1000) {
      // Flag high-value orders for review
      req.log.warn({
        ...auditLog,
        category: 'SECURITY', 
        event: 'HIGH_VALUE_ORDER',
        severity: 'MEDIUM'
      }, `High value order detected: €${auditLog.orderValue}`);
    }
  };
}

/**
 * Validate customer session for ordering
 */
export function validateCustomerSession(maxIdleMs: number = 30 * 60 * 1000) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      return; // No session validation for first request
    }
    
    // Implement proper session validation with Redis
    try {
      // Validate session format first
      if (!/^[a-zA-Z0-9-]{36}$/.test(sessionId)) {
        throw new ApiError(400, 'INVALID_SESSION', 'Invalid session format');
      }

      // Check if session exists and is still valid in Redis
      const sessionData = await redisService.get(`customer_session:${sessionId}`);
      
      if (!sessionData) {
        throw new ApiError(401, 'SESSION_EXPIRED', 'Customer session has expired');
      }

      // Check if session has been idle too long
      const lastActivity = new Date(sessionData.lastActivity || sessionData.createdAt);
      const now = new Date();
      const idleTime = now.getTime() - lastActivity.getTime();
      
      if (idleTime > maxIdleMs) {
        // Clean up expired session
        await redisService.del(`customer_session:${sessionId}`);
        throw new ApiError(401, 'SESSION_IDLE_TIMEOUT', 'Session expired due to inactivity');
      }

      // Update last activity time
      sessionData.lastActivity = now.toISOString();
      await redisService.set(`customer_session:${sessionId}`, sessionData, 2 * 60 * 60); // 2 hour TTL
      
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Redis or other errors - log but don't block
      req.log.warn({
        category: 'SECURITY',
        event: 'SESSION_VALIDATION_ERROR',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 'Customer session validation failed');
    }
  };
}

// Redis automatically handles TTL and cleanup