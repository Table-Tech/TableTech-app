// src/middleware/order.security.ts
import { FastifyRequest, FastifyReply } from "fastify";
import { RateLimitError } from "../types/errors.js";
import { OrderTimeoutError, DuplicateOrderError } from "../types/errors/order.errors.js";

// In-memory rate limiting store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const orderAttempts = new Map<string, { attempts: number; lastAttempt: number }>();

export class OrderSecurity {
  // Rate limiting for order creation (per IP)
  static rateLimitOrderCreation = (maxAttempts: number = 5, windowMs: number = 60000) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const clientIP = request.ip || 'unknown';
      const now = Date.now();
      const key = `order_create_${clientIP}`;
      
      const current = rateLimitStore.get(key);
      
      if (!current || now > current.resetTime) {
        // Reset or initialize counter
        rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
        return;
      }
      
      if (current.count >= maxAttempts) {
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        throw new RateLimitError(retryAfter);
      }
      
      // Increment counter
      current.count++;
      rateLimitStore.set(key, current);
    };
  };

  // Prevent duplicate orders from same table within time window
  static preventDuplicateOrders = (windowMs: number = 30000) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const orderData = request.validatedData?.body;
      if (!orderData?.tableId) return;
      
      const now = Date.now();
      const key = `table_${orderData.tableId}`;
      
      const lastOrder = orderAttempts.get(key);
      
      if (lastOrder && (now - lastOrder.lastAttempt) < windowMs) {
        throw new DuplicateOrderError(orderData.tableId);
      }
      
      // Record this order attempt
      orderAttempts.set(key, { attempts: 1, lastAttempt: now });
    };
  };

  // Validate order session (prevent stale orders)
  static validateOrderSession = (maxSessionMs: number = 30 * 60 * 1000) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionStart = request.headers['x-session-start'];
      
      if (sessionStart) {
        const sessionStartTime = parseInt(sessionStart as string);
        const now = Date.now();
        
        if (now - sessionStartTime > maxSessionMs) {
          throw new OrderTimeoutError('session');
        }
      }
    };
  };

  // Sanitize order data for security
  static sanitizeOrderData = async (request: FastifyRequest, reply: FastifyReply) => {
    const orderData = request.validatedData?.body;
    if (!orderData) return;

    // Remove any potentially harmful fields
    delete (orderData as any).__proto__;
    delete (orderData as any).constructor;
    
    // Sanitize notes fields
    if (orderData.notes) {
      orderData.notes = orderData.notes
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+=/gi, '') // Remove event handlers
        .trim();
    }

    // Sanitize item notes
    if (orderData.orderItems) {
      orderData.orderItems.forEach((item: any) => {
        if (item.notes) {
          item.notes = item.notes
            .replace(/<[^>]*>/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '')
            .trim();
        }
      });
    }
  };

  // Log order attempts for audit
  static logOrderAttempt = async (request: FastifyRequest, reply: FastifyReply) => {
    const clientIP = request.ip;
    const userAgent = request.headers['user-agent'];
    const orderData = request.validatedData?.body;
    
    // In production, use proper logging service
    console.log(`[ORDER_ATTEMPT] ${new Date().toISOString()}`, {
      ip: clientIP,
      userAgent,
      tableId: orderData?.tableId,
      restaurantId: orderData?.restaurantId,
      itemCount: orderData?.orderItems?.length || 0,
      requestId: request.requestId
    });
  };

  // Validate business hours
  static validateBusinessHours = async (request: FastifyRequest, reply: FastifyReply) => {
    const orderData = request.validatedData?.body;
    if (!orderData?.restaurantId) return;

    // TODO: Fetch restaurant business hours from database
    // For now, simple time check
    const hour = new Date().getHours();
    const day = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    
    // Example: Closed on Sundays and late nights
    if (day === 0 || hour < 8 || hour > 22) {
      throw new OrderTimeoutError('outside_business_hours');
    }
  };

  // Clean up old rate limit entries (run periodically)
  static cleanup = () => {
    const now = Date.now();
    
    // Clean rate limit store
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
        rateLimitStore.delete(key);
      }
    }
    
    // Clean order attempts (keep for 1 hour)
    for (const [key, value] of orderAttempts.entries()) {
      if (now - value.lastAttempt > 3600000) { // 1 hour
        orderAttempts.delete(key);
      }
    }
  };
}

// Start cleanup interval
setInterval(OrderSecurity.cleanup, 300000); // Every 5 minutes