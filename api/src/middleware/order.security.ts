import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../types/errors.js';
import { AuthenticatedRequest } from './auth.middleware.js';

// In-memory stores (use Redis in production)
const recentOrders: Map<string, number> = new Map();
const orderRateLimits: Map<string, { count: number; resetTime: number }> = new Map();

/**
 * Prevent duplicate orders (double-click protection)
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

    const lastOrderTime = recentOrders.get(key);
    const now = Date.now();
    
    if (lastOrderTime && now - lastOrderTime < windowMs) {
      const waitSeconds = Math.ceil((windowMs - (now - lastOrderTime)) / 1000);
      throw new ApiError(
        429,
        'DUPLICATE_ORDER',
        `Please wait ${waitSeconds} seconds before placing another order`
      );
    }
    
    recentOrders.set(key, now);
  };
}

/**
 * Enhanced rate limiting for order creation
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
      key = `${keyPrefix}:staff:${user.staffId}`;
    } else {
      key = `${keyPrefix}:customer:${req.ip}`;
    }

    const now = Date.now();
    const limit = orderRateLimits.get(key);
    
    if (!limit || now > limit.resetTime) {
      orderRateLimits.set(key, { count: 1, resetTime: now + windowMs });
      return;
    }
    
    if (limit.count >= maxOrders) {
      const retryAfter = Math.ceil((limit.resetTime - now) / 1000);
      reply.header('Retry-After', retryAfter.toString());
      
      throw new ApiError(
        429,
        'ORDER_RATE_LIMIT',
        `Too many orders. Try again in ${retryAfter} seconds`
      );
    }
    
    limit.count++;
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
    
    // TODO: Send to security monitoring service
    // await securityService.logOrderAttempt(auditLog);
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
    
    // TODO: Implement proper session validation with Redis
    // For now, just validate format
    if (!/^[a-zA-Z0-9-]{36}$/.test(sessionId)) {
      throw new ApiError(400, 'INVALID_SESSION', 'Invalid session');
    }
  };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  // Clean old entries
  for (const [key, time] of recentOrders.entries()) {
    if (now - time > oneHour) {
      recentOrders.delete(key);
    }
  }
  
  for (const [key, limit] of orderRateLimits.entries()) {
    if (now > limit.resetTime + oneHour) {
      orderRateLimits.delete(key);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes