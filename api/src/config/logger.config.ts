// src/config/logger.config.ts
import { DestinationStream, LoggerOptions } from 'pino';
import { createWriteStream } from 'fs';
import { join } from 'path';
import { mkdir } from 'fs/promises';

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
await mkdir(logsDir, { recursive: true }).catch(() => {});

// Different log levels for different environments
export const LOG_LEVELS = {
  development: 'debug',
  test: 'error',
  staging: 'info',
  production: 'info'
} as const;

// Log categories for filtering
export const LOG_CATEGORIES = {
  AUTH: 'Authentication and authorization events',
  ORDER: 'Order lifecycle events',
  CUSTOMER: 'Customer interactions',
  SECURITY: 'Security-related events',
  DATABASE: 'Database operations',
  PERFORMANCE: 'Performance metrics',
  BUSINESS: 'Business logic events',
  SYSTEM: 'System-level events'
} as const;

// Production logger configuration with file rotation
export const productionLoggerConfig: LoggerOptions = {
  level: process.env.LOG_LEVEL || LOG_LEVELS[process.env.NODE_ENV as keyof typeof LOG_LEVELS] || 'info',
  
  // Redact sensitive information
  redact: {
    paths: [
      'password',
      'token',
      'authorization',
      'cookie',
      'creditCard',
      'ssn',
      '*.password',
      '*.token',
      'headers.authorization',
      'headers.cookie'
    ],
    censor: '[REDACTED]'
  },
  
  // Custom serializers for consistent formatting
  serializers: {
    err: (err: Error) => ({
      type: err.name,
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      code: (err as any).code,
      statusCode: (err as any).statusCode
    }),
    
    req: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.headers?.['user-agent']
    }),
    
    res: (res: any) => ({
      statusCode: res.statusCode,
      duration: res.responseTime
    })
  }
};

// Log rotation configuration
export const logRotationConfig = {
  // Separate files for different log levels
  streams: [
    // All logs
    {
      level: 'debug',
      stream: createWriteStream(join(logsDir, 'app.log'), { flags: 'a' })
    },
    // Errors only
    {
      level: 'error',
      stream: createWriteStream(join(logsDir, 'error.log'), { flags: 'a' })
    },
    // Security events
    {
      level: 'info',
      stream: createWriteStream(join(logsDir, 'security.log'), { flags: 'a' }),
      // Custom filter for security events
      filter: (log: any) => log.category === 'SECURITY' || log.category === 'AUTH'
    },
    // Business metrics
    {
      level: 'info',
      stream: createWriteStream(join(logsDir, 'business.log'), { flags: 'a' }),
      filter: (log: any) => log.category === 'BUSINESS' || log.category === 'ORDER'
    }
  ]
};

// Log retention policies
export const LOG_RETENTION_POLICIES = {
  'app.log': 30,        // 30 days
  'error.log': 90,      // 90 days
  'security.log': 365,  // 1 year (compliance)
  'business.log': 180   // 6 months
};

// Structured logging best practices
export const LOGGING_BEST_PRACTICES = {
  // Always include these fields
  requiredFields: ['category', 'action', 'timestamp'],
  
  // Performance thresholds
  slowRequestThreshold: 1000,     // 1 second
  slowQueryThreshold: 100,        // 100ms
  highMemoryThreshold: 500 * 1024 * 1024, // 500MB
  
  // Rate limiting for logs (prevent log spam)
  rateLimits: {
    maxLogsPerMinute: 1000,
    maxErrorsPerMinute: 100,
    maxSecurityEventsPerMinute: 50
  }
};

// Export types for TypeScript
export type LogCategory = keyof typeof LOG_CATEGORIES;
export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

// Audit log configuration (for compliance)
export const auditLogConfig = {
  enabled: process.env.ENABLE_AUDIT_LOG === 'true',
  
  // Events that must be audited
  auditableEvents: [
    'LOGIN_ATTEMPT',
    'LOGOUT',
    'ORDER_CREATED',
    'ORDER_CANCELLED',
    'PAYMENT_PROCESSED',
    'STAFF_CREATED',
    'STAFF_DELETED',
    'PERMISSION_CHANGED',
    'DATA_EXPORTED',
    'SETTINGS_CHANGED'
  ],
  
  // Audit log format
  format: (event: any) => ({
    timestamp: new Date().toISOString(),
    eventType: event.action,
    userId: event.staffId || event.customerId,
    resourceType: event.category,
    resourceId: event.orderId || event.tableId || event.itemId,
    changes: event.changes,
    ipAddress: event.ip,
    userAgent: event.userAgent,
    success: event.success,
    errorMessage: event.error
  })
};

// Log aggregation for analytics
export const logAggregationConfig = {
  // Metrics to track
  metrics: {
    ordersPerHour: { window: '1h', category: 'ORDER', action: 'ORDER_CREATED' },
    failedLogins: { window: '15m', category: 'AUTH', action: 'LOGIN_ATTEMPT', filter: { success: false } },
    averageResponseTime: { window: '5m', category: 'PERFORMANCE', metric: 'duration' },
    errorRate: { window: '5m', level: 'error' }
  },
  
  // Alerts based on aggregated metrics
  alerts: {
    highErrorRate: { threshold: 10, window: '5m', severity: 'critical' },
    suspiciousLoginAttempts: { threshold: 5, window: '15m', severity: 'warning' },
    slowResponseTime: { threshold: 2000, window: '5m', severity: 'warning' }
  }
};

// Environment-specific configurations
export function getLoggerConfig(): LoggerOptions {
  switch (process.env.NODE_ENV) {
    case 'production':
      return productionLoggerConfig;
      
    case 'development':
      return {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true,
            singleLine: false
          }
        }
      };
      
    case 'test':
      return {
        level: 'error',
        transport: {
          target: 'pino-pretty',
          options: { colorize: false }
        }
      };
      
    default:
      return { level: 'info' };
  }
}