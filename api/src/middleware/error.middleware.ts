import { FastifyRequest, FastifyReply, FastifyError } from "fastify";
import { ZodError } from "zod";
import { 
  ErrorFormatter, 
  ValidationError, 
  BusinessLogicError, 
  AuthenticationError, 
  AuthorizationError, 
  ResourceNotFoundError,
  RateLimitError 
} from "../types/errors";

// Global error handler for Fastify
export const globalErrorHandler = (
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const requestId = request.requestId || 'unknown';
  const path = request.url;

  // Log error for monitoring (in production, use proper logging service)
  console.error(`[${requestId}] Error on ${request.method} ${path}:`, {
    error: error.message,
    stack: error.stack,
    userId: request.staff?.staffId,
    restaurantId: request.staff?.restaurantId
  });

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const errorResponse = ErrorFormatter.formatZodError(error, path);
    errorResponse.error.requestId = requestId;
    return reply.status(400).send(errorResponse);
  }

  // Handle custom error types
  if (error instanceof ValidationError ||
      error instanceof BusinessLogicError ||
      error instanceof AuthenticationError ||
      error instanceof AuthorizationError ||
      error instanceof ResourceNotFoundError ||
      error instanceof RateLimitError) {
    
    const errorResponse = ErrorFormatter.formatCustomError(error, path, requestId);
    return reply.status(error.statusCode).send(errorResponse);
  }

  // Handle Fastify built-in errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({
      error: {
        type: 'HTTP_ERROR',
        message: error.message,
        timestamp: new Date().toISOString(),
        path,
        requestId
      }
    });
  }

  // Handle database errors
  if (error.message.includes('Unique constraint')) {
    return reply.status(409).send({
      error: {
        type: 'DUPLICATE_RESOURCE',
        message: 'Resource already exists',
        timestamp: new Date().toISOString(),
        path,
        requestId
      }
    });
  }

  if (error.message.includes('Foreign key constraint')) {
    return reply.status(400).send({
      error: {
        type: 'INVALID_REFERENCE',
        message: 'Referenced resource does not exist',
        timestamp: new Date().toISOString(),
        path,
        requestId
      }
    });
  }

  // Handle unexpected errors
  const errorResponse = ErrorFormatter.formatGenericError(error, path, requestId);
  
  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production') {
    errorResponse.error.message = 'An unexpected error occurred';
  }

  return reply.status(500).send(errorResponse);
};

// 404 handler for undefined routes
export const notFoundHandler = (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.requestId || 'unknown';
  
  return reply.status(404).send({
    error: {
      type: 'ROUTE_NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId
    }
  });
};

// Request timeout handler
export const timeoutHandler = (request: FastifyRequest, reply: FastifyReply) => {
  const requestId = request.requestId || 'unknown';
  
  return reply.status(408).send({
    error: {
      type: 'REQUEST_TIMEOUT',
      message: 'Request took too long to process',
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId
    }
  });
};