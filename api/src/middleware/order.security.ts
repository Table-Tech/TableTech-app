// src/middleware/order.security.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { ApiError } from '../types/errors.js';
import { AuthenticatedRequest } from './auth.middleware.js';

// Simple in-memory stores (use Redis in production)
const lastOrderTimestamps: Record<string, number> = {};
const orderAttempts: Record<string, { attempts: number; firstAttempt: number }> = {};

/**
 * Prevent duplicate orders within a time window (ms)
 */
export function preventDuplicateOrders(windowMs: number) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      // requireUser should run first
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const key = user.staffId || user.email;
    const now = Date.now();
    const last = lastOrderTimestamps[key];
    
    if (last && now - last < windowMs) {
      const waitTime = Math.ceil((windowMs - (now - last)) / 1000);
      
      req.log.warn({
        staffId: user.staffId,
        timeSinceLastOrder: now - last,
        windowMs,
        waitTime,
        ip: req.ip
      }, 'Duplicate order attempt blocked');
      
      throw new ApiError(
        429,
        'TOO_MANY_REQUESTS',
        `Please wait ${waitTime} more seconds before placing another order`
      );
    }
    
    lastOrderTimestamps[key] = now;
  };
}

/**
 * Rate limiting for order creation (per user)
 */
export function rateLimitOrderCreation(maxAttempts: number, windowMs: number) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const key = `order_create_${user.staffId}`;
    const now = Date.now();
    
    const current = orderAttempts[key];
    
    if (!current || now - current.firstAttempt > windowMs) {
      // Reset or initialize counter
      orderAttempts[key] = { attempts: 1, firstAttempt: now };
      return;
    }
    
    if (current.attempts >= maxAttempts) {
      const retryAfter = Math.ceil((windowMs - (now - current.firstAttempt)) / 1000);
      
      req.log.warn({
        staffId: user.staffId,
        attempts: current.attempts,
        maxAttempts,
        retryAfter,
        ip: req.ip
      }, 'Order creation rate limit exceeded');
      
      reply.header('Retry-After', retryAfter.toString());
      throw new ApiError(
        429,
        'RATE_LIMIT_EXCEEDED',
        `Too many order attempts. Try again in ${retryAfter} seconds.`
      );
    }
    
    // Increment counter
    current.attempts++;
    orderAttempts[key] = current;
  };
}

/**
 * Validate business hours for order creation
 */
export function validateBusinessHours() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Example business hours: Monday-Saturday 8AM-10PM, Closed Sunday
    if (day === 0) {
      req.log.warn({
        day,
        hour,
        ip: req.ip
      }, 'Order attempt during closed day');
      
      throw new ApiError(400, 'RESTAURANT_CLOSED', 'Restaurant is closed on Sundays');
    }
    
    if (hour < 8 || hour >= 22) {
      req.log.warn({
        day,
        hour,
        ip: req.ip
      }, 'Order attempt outside business hours');
      
      throw new ApiError(400, 'RESTAURANT_CLOSED', 'Restaurant is closed. Business hours: 8AM-10PM');
    }
  };
}

/**
 * Sanitize order data for security
 */
export function sanitizeOrderData() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const orderData = req.body as any;
    if (!orderData) return;

    // Remove potentially harmful fields
    delete orderData.__proto__;
    delete orderData.constructor;
    
    // Sanitize notes fields if present
    if (orderData.notes) {
      orderData.notes = sanitizeText(orderData.notes);
    }

    // Sanitize item notes
    if (orderData.items && Array.isArray(orderData.items)) {
      orderData.items.forEach((item: any) => {
        if (item.notes) {
          item.notes = sanitizeText(item.notes);
        }
      });
    }
  };
}

/**
 * Log order attempts for audit
 */
export function logOrderAttempt() {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as AuthenticatedRequest).user;
    const orderData = req.body as any;
    
    req.log.info({
      staffId: user?.staffId,
      restaurantId: user?.restaurantId,
      tableId: orderData?.tableId,
      itemCount: orderData?.items?.length || 0,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    }, 'Order creation attempt');
  };
}

/**
 * Validate order session (prevent stale orders)
 */
export function validateOrderSession(maxSessionMs: number = 30 * 60 * 1000) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const sessionStart = req.headers['x-session-start'];
    
    if (sessionStart) {
      const sessionStartTime = parseInt(sessionStart as string);
      const now = Date.now();
      
      if (isNaN(sessionStartTime) || now - sessionStartTime > maxSessionMs) {
        req.log.warn({
          sessionStart: sessionStartTime,
          now,
          maxSessionMs,
          ip: req.ip
        }, 'Order session validation failed');
        
        throw new ApiError(400, 'SESSION_EXPIRED', 'Order session has expired. Please refresh and try again.');
      }
    }
  };
}

// Helper function to sanitize text input
function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .slice(0, 500); // Limit length
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  // Clean order timestamps older than 1 hour
  for (const [key, timestamp] of Object.entries(lastOrderTimestamps)) {
    if (now - timestamp > oneHour) {
      delete lastOrderTimestamps[key];
    }
  }
  
  // Clean order attempts older than 1 hour
  for (const [key, data] of Object.entries(orderAttempts)) {
    if (now - data.firstAttempt > oneHour) {
      delete orderAttempts[key];
    }
  }
}, 300000); // Cleanup every 5 minutes