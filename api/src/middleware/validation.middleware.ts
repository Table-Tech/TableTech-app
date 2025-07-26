// src/middleware/validation.middleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodSchema, ZodError } from 'zod';
import { ApiError } from '../types/errors.js';

/**
 * Generic validation middleware for request body
 */
export function validationMiddleware<T extends ZodSchema<any>>(schema: T) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      req.body = schema.parse(req.body);
    } catch (err) {
      if (err instanceof ZodError) {
        // Log validation failure for monitoring
        req.log.debug({
          url: req.url,
          method: req.method,
          errors: err.flatten(),
          ip: req.ip
        }, 'Request validation failed');
        
        throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed');
      }
      throw err;
    }
  };
}

/**
 * Validation middleware for request parameters
 */
export function validateParams<T extends ZodSchema<any>>(schema: T) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      req.params = schema.parse(req.params);
    } catch (err) {
      if (err instanceof ZodError) {
        req.log.debug({
          url: req.url,
          method: req.method,
          errors: err.flatten(),
          params: req.params,
          ip: req.ip
        }, 'Parameter validation failed');
        
        throw new ApiError(400, 'VALIDATION_ERROR', 'Parameter validation failed');
      }
      throw err;
    }
  };
}

/**
 * Validation middleware for query parameters
 */
export function validateQuery<T extends ZodSchema<any>>(schema: T) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      req.query = schema.parse(req.query);
    } catch (err) {
      if (err instanceof ZodError) {
        req.log.debug({
          url: req.url,
          method: req.method,
          errors: err.flatten(),
          query: req.query,
          ip: req.ip
        }, 'Query validation failed');
        
        throw new ApiError(400, 'VALIDATION_ERROR', 'Query validation failed');
      }
      throw err;
    }
  };
}

/**
 * Combined validation middleware for body, params, and query
 */
export function validateRequest<
  TBody extends ZodSchema<any> = ZodSchema<any>,
  TParams extends ZodSchema<any> = ZodSchema<any>,
  TQuery extends ZodSchema<any> = ZodSchema<any>
>(schemas: {
  body?: TBody;
  params?: TParams;
  query?: TQuery;
}) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
    } catch (err) {
      if (err instanceof ZodError) {
        req.log.debug({
          url: req.url,
          method: req.method,
          errors: err.flatten(),
          ip: req.ip
        }, 'Request validation failed');
        
        throw new ApiError(400, 'VALIDATION_ERROR', 'Request validation failed');
      }
      throw err;
    }
  };
}

/**
 * Request size limiting middleware
 */
export function limitRequestSize(maxSizeBytes: number) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      req.log.warn({
        contentLength: parseInt(contentLength),
        maxSize: maxSizeBytes,
        url: req.url,
        ip: req.ip
      }, 'Request size limit exceeded');
      
      throw new ApiError(413, 'PAYLOAD_TOO_LARGE', `Request size exceeds ${maxSizeBytes} bytes`);
    }
  };
}

/**
 * Redis-based rate limiting middleware
 */
import { redisService } from '../services/infrastructure/redis/redis.service.js';

export function rateLimit(maxRequests: number, windowMs: number, keyPrefix: string = 'general') {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const clientIP = req.ip || 'unknown';
    const key = `${clientIP}:${req.url}`;
    
    try {
      const rateLimiter = redisService.getRateLimiter(`${keyPrefix}_rate_limit`, {
        points: maxRequests,
        duration: Math.ceil(windowMs / 1000), // Convert to seconds
      });

      await rateLimiter.consume(key);
    } catch (rejRes: any) {
      const retryAfter = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      req.log.warn({
        ip: clientIP,
        url: req.url,
        maxRequests,
        retryAfter,
        keyPrefix
      }, 'Rate limit exceeded');
      
      reply.header('Retry-After', retryAfter.toString());
      reply.header('X-RateLimit-Limit', maxRequests.toString());
      reply.header('X-RateLimit-Remaining', '0');
      reply.header('X-RateLimit-Reset', new Date(Date.now() + rejRes.msBeforeNext).toISOString());
      
      throw new ApiError(429, 'RATE_LIMIT_EXCEEDED', `Too many requests. Try again in ${retryAfter} seconds.`);
    }
  };
}