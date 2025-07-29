// Professional logging setup for TableTech API
import pino from 'pino';
import { FastifyRequest } from 'fastify';

// Base logger with enhanced context
const baseLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    env: process.env.NODE_ENV,
    service: 'tabletech-api',
    version: process.env.npm_package_version || '1.0.0',
    region: 'eu-west-1' // Netherlands/Europe
  },
  // Pretty print in development
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
      colorize: true
    }
  } : undefined
});

// Request-scoped logger with full context
export function createRequestLogger(req: FastifyRequest) {
  return baseLogger.child({
    requestId: req.id,
    userId: (req as any).user?.staffId,
    restaurantId: (req as any).user?.restaurantId,
    userRole: (req as any).user?.role,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.url,
    correlationId: req.headers['x-correlation-id'] || req.id
  });
}

// Specialized loggers for different concerns
export const logger = {
  // Base logger for general use
  base: baseLogger,
  
  // Performance tracking and monitoring
  perf: {
    slow: (operation: string, duration: number, threshold: number = 1000, context?: any) => {
      if (duration > threshold) {
        baseLogger.warn({
          category: 'PERFORMANCE',
          operation,
          duration,
          threshold,
          ...context
        }, `Slow ${operation}: ${duration}ms (threshold: ${threshold}ms)`);
      }
    },
    
    timing: (operation: string, duration: number, context?: any) => {
      baseLogger.info({
        category: 'PERFORMANCE',
        operation,
        duration,
        ...context
      }, `${operation} completed in ${duration}ms`);
    },
    
    memory: (operation: string, memoryUsage: NodeJS.MemoryUsage) => {
      const heapMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;
      if (heapMB > 100) { // Alert if over 100MB heap
        baseLogger.warn({
          category: 'PERFORMANCE',
          operation,
          heapUsedMB: heapMB,
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100
        }, `High memory usage in ${operation}: ${heapMB}MB`);
      }
    }
  },

  // Security and fraud detection
  security: {
    suspiciousActivity: (req: FastifyRequest, reason: string, severity: 'low' | 'medium' | 'high' = 'medium') => {
      baseLogger.warn({
        category: 'SECURITY',
        severity,
        reason,
        ip: req.ip,
        url: req.url,
        userAgent: req.headers['user-agent'],
        userId: (req as any).user?.staffId,
        restaurantId: (req as any).user?.restaurantId
      }, `Suspicious activity detected: ${reason}`);
    },
    
    loginAttempt: (email: string, success: boolean, ip: string, reason?: string) => {
      const level = success ? 'info' : 'warn';
      baseLogger[level]({
        category: 'SECURITY',
        action: 'LOGIN_ATTEMPT',
        email,
        success,
        ip,
        reason
      }, `Login ${success ? 'successful' : 'failed'} for ${email}`);
    },
    
    rateLimited: (ip: string, endpoint: string, attempts: number) => {
      baseLogger.warn({
        category: 'SECURITY',
        action: 'RATE_LIMITED',
        ip,
        endpoint,
        attempts
      }, `Rate limit exceeded: ${attempts} attempts to ${endpoint}`);
    },

    // CRITICAL production security logging
    webhookSecurityViolation: (reason: string, context?: any) => {
      baseLogger.error({
        category: 'SECURITY',
        event: 'WEBHOOK_SECURITY_VIOLATION',
        reason,
        severity: 'CRITICAL',
        ...context
      }, `Webhook security violation: ${reason}`);
    },

    rateLimitExceeded: (ip: string, endpoint: string, attempts: number) => {
      baseLogger.warn({
        category: 'SECURITY',
        event: 'RATE_LIMIT_EXCEEDED',
        ip,
        endpoint,
        attempts,
        severity: 'HIGH'
      }, `Rate limit exceeded from ${ip} on ${endpoint}`);
    },

    paymentFraudAttempt: (paymentId: string, reason: string, context?: any) => {
      baseLogger.error({
        category: 'SECURITY',
        event: 'PAYMENT_FRAUD_ATTEMPT',
        paymentId,
        reason,
        severity: 'CRITICAL',
        ...context
      }, `Potential payment fraud detected: ${reason}`);
    },

    invalidApiAccess: (ip: string, endpoint: string, reason: string) => {
      baseLogger.warn({
        category: 'SECURITY',
        event: 'INVALID_API_ACCESS',
        ip,
        endpoint,
        reason,
        severity: 'MEDIUM'
      }, `Invalid API access attempt: ${reason}`);
    }
  },

  // Business metrics and KPIs
  business: {
    revenue: (amount: number, orderId: string, restaurantId: string, context?: any) => {
      baseLogger.info({
        category: 'BUSINESS',
        metric: 'revenue',
        amount: Number(amount),
        orderId,
        restaurantId,
        currency: 'EUR',
        ...context
      }, `Revenue generated: €${amount} (Order: ${orderId})`);
    },
    
    orderMetrics: (orderId: string, restaurantId: string, metrics: {
      itemCount: number;
      preparationTime?: number;
      customerWaitTime?: number;
      tableNumber: number;
    }) => {
      baseLogger.info({
        category: 'BUSINESS',
        metric: 'order_completion',
        orderId,
        restaurantId,
        ...metrics
      }, `Order completed: ${metrics.itemCount} items, table ${metrics.tableNumber}`);
    },
    
    customerBehavior: (action: string, sessionToken: string, tableId: string, context?: any) => {
      baseLogger.info({
        category: 'BUSINESS',
        metric: 'customer_behavior',
        action,
        sessionToken,
        tableId,
        ...context
      }, `Customer ${action}`);
    }
  },


  // Payment logging
  payment: {
    created: (paymentId: string, amount: number, orderId: string) => {
      baseLogger.info({
        category: 'PAYMENT',
        action: 'PAYMENT_CREATED',
        paymentId,
        amount,
        orderId,
        currency: 'EUR'
      }, `Payment created: €${amount} for order ${orderId}`);
    },
    
    initiated: (paymentId: string, amount: number, orderId: string) => {
      baseLogger.info({
        category: 'PAYMENT',
        action: 'PAYMENT_INITIATED',
        paymentId,
        amount,
        orderId,
        currency: 'EUR'
      }, `Payment initiated: €${amount} for order ${orderId}`);
    },
    
    completed: (paymentId: string, amount: number, orderId: string) => {
      baseLogger.info({
        category: 'PAYMENT',
        action: 'PAYMENT_COMPLETED',
        paymentId,
        amount,
        orderId
      }, `Payment completed: €${amount}`);
    },
    
    failed: (paymentId: string, reason: string, orderId: string) => {
      baseLogger.warn({
        category: 'PAYMENT',
        action: 'PAYMENT_FAILED',
        paymentId,
        reason,
        orderId
      }, `Payment failed: ${reason}`);
    }
  },

  // Customer session logging
  customer: {
    sessionStarted: (req: any, sessionToken: string) => {
      baseLogger.info({
        category: 'CUSTOMER',
        action: 'SESSION_STARTED',
        sessionToken
      }, `Customer session started: ${sessionToken}`);
    }
  },

  // Error handling with context
  error: {
    log: (error: Error, context?: any) => {
      baseLogger.error({
        category: 'ERROR',
        errorName: error.name,
        errorMessage: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        ...context
      }, `Error: ${error.message}`);
    },
    
    apiError: (req: FastifyRequest, error: any, statusCode: number) => {
      const reqLogger = createRequestLogger(req);
      reqLogger.error({
        category: 'ERROR',
        statusCode,
        errorName: error.name,
        errorMessage: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, `API Error: ${statusCode} - ${error.message}`);
    }
  },

  // System and infrastructure
  system: {
    startup: (port: number, services: string[]) => {
      baseLogger.info({
        category: 'SYSTEM',
        action: 'STARTUP',
        port,
        services,
        nodeVersion: process.version,
        platform: process.platform
      }, `TableTech API started on port ${port}`);
    },
    
    start: (service: string, details?: any) => {
      baseLogger.info({
        category: 'SYSTEM',
        action: 'SERVICE_START',
        service,
        ...details
      }, `${service} service started`);
    },
    
    stop: (service: string, details?: any) => {
      baseLogger.info({
        category: 'SYSTEM',
        action: 'SERVICE_STOP',
        service,
        ...details
      }, `${service} service stopped`);
    },
    
    shutdown: (reason: string) => {
      baseLogger.info({
        category: 'SYSTEM',
        action: 'SHUTDOWN',
        reason
      }, `API shutting down: ${reason}`);
    },
    
    serviceHealth: (service: string, status: 'healthy' | 'unhealthy', details?: any) => {
      const level = status === 'healthy' ? 'info' : 'error';
      baseLogger[level]({
        category: 'SYSTEM',
        service,
        status,
        ...details
      }, `Service ${service} is ${status}`);
    }
  },

  // Database operations
  database: {
    query: (query: string, duration: number, recordCount?: number) => {
      if (duration > 100) { // Log slow queries
        baseLogger.warn({
          category: 'DATABASE',
          query: query.substring(0, 100) + '...', // Truncate long queries
          duration,
          recordCount
        }, `Slow database query: ${duration}ms`);
      }
    },
    
    connection: (status: 'connected' | 'disconnected' | 'error', details?: any) => {
      const level = status === 'connected' ? 'info' : 'error';
      baseLogger[level]({
        category: 'DATABASE',
        status,
        ...details
      }, `Database ${status}`);
    }
  }
};

// Backward compatibility with existing code
export const createLogger = () => ({
  info: baseLogger.info.bind(baseLogger),
  error: baseLogger.error.bind(baseLogger),
  warn: baseLogger.warn.bind(baseLogger),
  debug: baseLogger.debug.bind(baseLogger)
});

// Deprecated - kept for existing code compatibility  
export const oldLogger = {
  base: {
    info: (data: any, message: string) => baseLogger.info(data, message),
    debug: (data: any, message: string) => baseLogger.debug(data, message),
    warn: (data: any, message: string) => baseLogger.warn(data, message),
    error: (data: any, message: string) => baseLogger.error(data, message)
  },
  customer: {
    sessionStarted: (req: any, sessionToken: string) => {
      baseLogger.info({
        category: 'CUSTOMER',
        action: 'SESSION_STARTED',
        sessionToken
      }, `Customer session started: ${sessionToken}`);
    }
  },
  error: {
    log: (error: Error, context?: any) => logger.error.log(error, context)
  }
};

// Export default for easier imports
export default logger;