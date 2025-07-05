import { FastifyRequest, FastifyReply } from "fastify";
import { ZodSchema, ZodError } from "zod";
import { ErrorFormatter, ValidationError } from "../types/errors";
import { v4 as uuidv4 } from "uuid";

// Extend FastifyRequest to include validated data and request ID
declare module 'fastify' {
  interface FastifyRequest {
    validatedData?: any;
    requestId?: string;
  }
}

// Input sanitization helpers
export class InputSanitizer {
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .substring(0, 10000); // Prevent extremely long strings
  }

  static sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Skip dangerous keys
        if (['__proto__', 'constructor', 'prototype'].includes(key)) {
          continue;
        }
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}

// Main validation middleware factory
export const validateRequest = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = uuidv4();
    request.requestId = requestId;

    try {
      const validatedData: any = {};

      // Validate and sanitize request body
      if (schemas.body && request.body) {
        const sanitizedBody = InputSanitizer.sanitizeObject(request.body);
        const bodyResult = schemas.body.safeParse(sanitizedBody);
        
        if (!bodyResult.success) {
          const errorResponse = ErrorFormatter.formatZodError(
            bodyResult.error, 
            request.url
          );
          errorResponse.error.requestId = requestId;
          return reply.status(400).send(errorResponse);
        }
        
        validatedData.body = bodyResult.data;
      }

      // Validate query parameters
      if (schemas.query && request.query) {
        const queryResult = schemas.query.safeParse(request.query);
        
        if (!queryResult.success) {
          const errorResponse = ErrorFormatter.formatZodError(
            queryResult.error,
            request.url
          );
          errorResponse.error.requestId = requestId;
          return reply.status(400).send(errorResponse);
        }
        
        validatedData.query = queryResult.data;
      }

      // Validate URL parameters
      if (schemas.params && request.params) {
        const paramsResult = schemas.params.safeParse(request.params);
        
        if (!paramsResult.success) {
          const errorResponse = ErrorFormatter.formatZodError(
            paramsResult.error,
            request.url
          );
          errorResponse.error.requestId = requestId;
          return reply.status(400).send(errorResponse);
        }
        
        validatedData.params = paramsResult.data;
      }

      // Attach validated data to request
      request.validatedData = validatedData;

    } catch (error) {
      const errorResponse = ErrorFormatter.formatGenericError(
        error as Error,
        request.url,
        requestId
      );
      return reply.status(500).send(errorResponse);
    }
  };
};

// Request size limiter
export const limitRequestSize = (maxSize: number = 1024 * 1024) => { // 1MB default
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const contentLength = request.headers['content-length'];
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return reply.status(413).send({
        error: {
          type: 'REQUEST_TOO_LARGE',
          message: `Request body too large. Maximum size: ${maxSize} bytes`,
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};

// Content type validator
export const validateContentType = (allowedTypes: string[] = ['application/json']) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const contentType = request.headers['content-type'];
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      return reply.status(415).send({
        error: {
          type: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
          timestamp: new Date().toISOString()
        }
      });
    }
  };
};