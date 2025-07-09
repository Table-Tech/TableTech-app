// /api/src/utils/logger.ts
import { FastifyRequest } from 'fastify';
import { pino, Logger as PinoLogger } from 'pino';
import { getLoggerConfig } from '../config/logger.config.js';

// More comprehensive types
interface LogContext {
  requestId?: string;
  userId?: string;
  staffId?: string;
  customerId?: string;
  restaurantId?: string;
  tableId?: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  correlationId?: string;
}

// Extended categories
export enum LogCategory {
  AUTH = 'AUTH',
  ORDER = 'ORDER',
  CUSTOMER = 'CUSTOMER',
  SECURITY = 'SECURITY',
  PAYMENT = 'PAYMENT',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM',
  DATABASE = 'DATABASE',
  PERFORMANCE = 'PERFORMANCE',
  ERROR = 'ERROR',
  BUSINESS = 'BUSINESS'
}

// Event types for better filtering
export enum LogEvent {
  // Auth events
  LOGIN_ATTEMPT = 'LOGIN_ATTEMPT',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_RESET = 'PASSWORD_RESET',
  
  // Order events
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_STATUS_CHANGE = 'ORDER_STATUS_CHANGE',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  
  // Security events
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  
  // Payment events
  PAYMENT_INITIATED = 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',
  
  // System events
  SERVER_START = 'SERVER_START',
  SERVER_STOP = 'SERVER_STOP',
  HEALTH_CHECK = 'HEALTH_CHECK',
  CACHE_HIT = 'CACHE_HIT',
  CACHE_MISS = 'CACHE_MISS'
}

// Get environment-specific configuration
const loggerConfig = {
  ...getLoggerConfig(),
  
  // Base context
  base: {
    env: process.env.NODE_ENV,
    service: 'restaurant-api',
    version: process.env.APP_VERSION || '1.0.0',
    hostname: process.env.HOSTNAME
  }
};

// Create base logger instance
const baseLogger = pino(loggerConfig);

/**
 * Enhanced Logger class with more features
 */
export class Logger {
  private static extractContext(req?: FastifyRequest): LogContext {
    if (!req) return {};
    
    const user = (req as any).user;
    const customer = (req as any).customer;
    const table = (req as any).table;
    
    return {
      requestId: req.id,
      userId: user?.id || customer?.id,
      staffId: user?.staffId,
      customerId: customer?.id,
      restaurantId: user?.restaurantId || table?.restaurantId,
      tableId: table?.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: (req as any).sessionId,
      correlationId: req.headers['x-correlation-id'] as string
    };
  }

  // AUTH LOGGING
  static auth = {
    login: (req: FastifyRequest, email: string, success: boolean, reason?: string) => {
      const context = Logger.extractContext(req);
      const level = success ? 'info' : 'warn';
      
      baseLogger[level]({
        category: LogCategory.AUTH,
        event: LogEvent.LOGIN_ATTEMPT,
        email,
        success,
        reason,
        ...context
      }, `Login ${success ? 'successful' : 'failed'} for ${email}`);
    },

    logout: (req: FastifyRequest, userId: string) => {
      const context = Logger.extractContext(req);
      baseLogger.info({
        category: LogCategory.AUTH,
        event: LogEvent.LOGOUT,
        userId,
        ...context
      }, `User ${userId} logged out`);
    },

    tokenRefresh: (req: FastifyRequest, success: boolean) => {
      const context = Logger.extractContext(req);
      baseLogger.debug({
        category: LogCategory.AUTH,
        event: LogEvent.TOKEN_REFRESH,
        success,
        ...context
      }, `Token refresh ${success ? 'successful' : 'failed'}`);
    }
  };

  // ORDER LOGGING
  static order = {
    created: (req: FastifyRequest, order: {
      id: string;
      tableId: string;
      totalAmount: number;
      itemCount: number;
      paymentMethod: string;
    }) => {
      const context = Logger.extractContext(req);
      baseLogger.info({
        category: LogCategory.ORDER,
        event: LogEvent.ORDER_CREATED,
        orderId: order.id,
        tableId: order.tableId,
        totalAmount: order.totalAmount,
        itemCount: order.itemCount,
        paymentMethod: order.paymentMethod,
        ...context
      }, `Order ${order.id} created - €${order.totalAmount}`);
    },

    statusChanged: (req: FastifyRequest, orderId: string, fromStatus: string, toStatus: string, changedBy?: string) => {
      const context = Logger.extractContext(req);
      baseLogger.info({
        category: LogCategory.ORDER,
        event: LogEvent.ORDER_STATUS_CHANGE,
        orderId,
        fromStatus,
        toStatus,
        changedBy: changedBy || context.userId,
        ...context
      }, `Order ${orderId}: ${fromStatus} → ${toStatus}`);
    },

    cancelled: (req: FastifyRequest, orderId: string, reason: string) => {
      const context = Logger.extractContext(req);
      baseLogger.info({
        category: LogCategory.ORDER,
        event: LogEvent.ORDER_CANCELLED,
        orderId,
        reason,
        ...context
      }, `Order ${orderId} cancelled: ${reason}`);
    }
  };

  // SECURITY LOGGING
  static security = {
    rateLimitExceeded: (req: FastifyRequest, limitType: string, identifier: string, limit: number) => {
      const context = Logger.extractContext(req);
      baseLogger.warn({
        category: LogCategory.SECURITY,
        event: LogEvent.RATE_LIMIT_EXCEEDED,
        limitType,
        identifier,
        limit,
        endpoint: req.url,
        method: req.method,
        ...context
      }, `Rate limit exceeded: ${limitType} for ${identifier}`);
    },

    suspiciousActivity: (req: FastifyRequest, activity: string, details: any) => {
      const context = Logger.extractContext(req);
      baseLogger.warn({
        category: LogCategory.SECURITY,
        event: LogEvent.SUSPICIOUS_ACTIVITY,
        activity,
        details,
        ...context
      }, `Suspicious activity: ${activity}`);
    },

    unauthorizedAccess: (req: FastifyRequest, resource: string, reason: string) => {
      const context = Logger.extractContext(req);
      baseLogger.warn({
        category: LogCategory.SECURITY,
        event: LogEvent.UNAUTHORIZED_ACCESS,
        resource,
        reason,
        method: req.method,
        path: req.url,
        ...context
      }, `Unauthorized access to ${resource}: ${reason}`);
    }
  };

  // CUSTOMER LOGGING
  static customer = {
    qrScanned: (req: FastifyRequest, tableCode: string, tableNumber: number) => {
      const context = Logger.extractContext(req);
      baseLogger.info({
        category: LogCategory.CUSTOMER,
        event: 'QR_SCANNED',
        tableCode,
        tableNumber,
        ...context
      }, `QR scanned for table ${tableNumber}`);
    },

    sessionStarted: (req: FastifyRequest, sessionId: string) => {
      const context = Logger.extractContext(req);
      baseLogger.debug({
        category: LogCategory.CUSTOMER,
        event: 'SESSION_STARTED',
        sessionId,
        ...context
      }, 'Customer session started');
    }
  };

  // PAYMENT LOGGING  
  static payment = {
    initiated: (req: FastifyRequest, orderId: string, amount: number, method: string) => {
      const context = Logger.extractContext(req);
      baseLogger.info({
        category: LogCategory.PAYMENT,
        event: LogEvent.PAYMENT_INITIATED,
        orderId,
        amount,
        method,
        currency: 'EUR',
        ...context
      }, `Payment initiated for order ${orderId} - €${amount}`);
    },

    completed: (req: FastifyRequest, orderId: string, transactionId: string, amount: number) => {
      const context = Logger.extractContext(req);
      baseLogger.info({
        category: LogCategory.PAYMENT,
        event: LogEvent.PAYMENT_COMPLETED,
        orderId,
        transactionId,
        amount,
        ...context
      }, `Payment completed for order ${orderId}`);
    },

    failed: (req: FastifyRequest, orderId: string, reason: string, errorCode?: string) => {
      const context = Logger.extractContext(req);
      baseLogger.error({
        category: LogCategory.PAYMENT,
        event: LogEvent.PAYMENT_FAILED,
        orderId,
        reason,
        errorCode,
        ...context
      }, `Payment failed for order ${orderId}: ${reason}`);
    }
  };

  // ERROR LOGGING
  static error = {
    log: (error: Error, context?: any, req?: FastifyRequest) => {
      baseLogger.error({
        category: LogCategory.ERROR,
        event: 'ERROR',
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: (error as any).code
        },
        context,
        ...Logger.extractContext(req)
      }, error.message);
    },

    database: (operation: string, error: Error, query?: any) => {
      baseLogger.error({
        category: LogCategory.DATABASE,
        event: 'DATABASE_ERROR',
        operation,
        error: {
          name: error.name,
          message: error.message,
          code: (error as any).code
        },
        query: process.env.NODE_ENV === 'development' ? query : undefined
      }, `Database error in ${operation}: ${error.message}`);
    }
  };

  // PERFORMANCE LOGGING
  static performance = {
    slowRequest: (req: FastifyRequest, duration: number, threshold: number) => {
      const context = Logger.extractContext(req);
      baseLogger.warn({
        category: LogCategory.PERFORMANCE,
        event: 'SLOW_REQUEST',
        duration,
        threshold,
        method: req.method,
        path: req.url,
        ...context
      }, `Slow request: ${req.method} ${req.url} took ${duration}ms`);
    },

    timer: (operation: string) => {
      const start = Date.now();
      return {
        end: (metadata?: any) => {
          const duration = Date.now() - start;
          baseLogger.debug({
            category: LogCategory.PERFORMANCE,
            event: 'OPERATION_TIMING',
            operation,
            duration,
            ...metadata
          }, `${operation} completed in ${duration}ms`);
          return duration;
        }
      };
    }
  };

  // SYSTEM LOGGING
  static system = {
    start: () => {
      baseLogger.info({
        category: LogCategory.SYSTEM,
        event: LogEvent.SERVER_START,
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        port: process.env.PORT
      }, 'Server started');
    },

    stop: (reason: string) => {
      baseLogger.info({
        category: LogCategory.SYSTEM,
        event: LogEvent.SERVER_STOP,
        reason,
        uptime: process.uptime()
      }, `Server stopping: ${reason}`);
    },

    healthCheck: (healthy: boolean, details?: any) => {
      const level = healthy ? 'debug' : 'warn';
      baseLogger[level]({
        category: LogCategory.SYSTEM,
        event: LogEvent.HEALTH_CHECK,
        healthy,
        details
      }, `Health check: ${healthy ? 'OK' : 'FAILED'}`);
    }
  };

  // Create child logger for modules
  static createModuleLogger(module: string): PinoLogger {
    return baseLogger.child({ module });
  }

  // Get base logger for custom logging
  static get base(): PinoLogger {
    return baseLogger;
  }
}

// Export for convenience
export const logger = Logger;