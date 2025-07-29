// src/middleware/error.middleware.ts
import { FastifyError, FastifyReply, FastifyRequest, FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { ApiError, ValidationError } from '../types/errors.js';

/**
 * Registers global error and timeout handlers on the Fastify instance.
 */
export function registerErrorHandlers(fastify: FastifyInstance) {
  // Set global error handler
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log error with request context
    const requestId = request.id || 'unknown';
    const context = {
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      requestId
    };

    // Handle ValidationError (detailed validation errors)
    if (error instanceof ValidationError) {
      request.log.warn({ error: error.details, context }, 'Validation Error');
      return reply.status(error.statusCode).send({ 
        success: false, 
        error: {
          code: error.type,
          message: error.message,
          details: error.details
        },
        requestId 
      });
    }

    // Handle ApiError (our custom errors)
    if (error instanceof ApiError) {
      request.log.warn({ error: error.serialize(), context }, 'API Error');
      return reply.status(error.statusCode).send({ 
        success: false, 
        error: error.serialize(),
        requestId 
      });
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      request.log.warn({ error: error.flatten(), context }, 'Validation Error');
      return reply.status(400).send({ 
        success: false, 
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.flatten()
        },
        requestId 
      });
    }

    // Handle Prisma errors
    if (error.message?.includes('Unique constraint')) {
      request.log.warn({ error: error.message, context }, 'Database Constraint Error');
      return reply.status(409).send({
        success: false,
        error: {
          type: 'DUPLICATE_RESOURCE',
          message: 'Resource already exists'
        },
        requestId
      });
    }

    if (error.message?.includes('Foreign key constraint')) {
      request.log.warn({ error: error.message, context }, 'Database Reference Error');
      return reply.status(400).send({
        success: false,
        error: {
          type: 'INVALID_REFERENCE',
          message: 'Referenced resource does not exist'
        },
        requestId
      });
    }

    // Handle Fastify built-in errors (like 404, 405, etc.)
    if (error.statusCode) {
      request.log.warn({ error: error.message, statusCode: error.statusCode, context }, 'HTTP Error');
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          type: 'HTTP_ERROR',
          message: error.message
        },
        requestId
      });
    }

    // Handle unexpected errors
    request.log.error({ error: error.stack || error.message, context }, 'Unexpected Error');
    
    // In production, don't expose internal error details
    const message = process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message;

    return reply.status(500).send({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message
      },
      requestId
    });
  });

  // Set request timeout (use server.requestTimeout instead of setTimeout)
  fastify.addHook('onRequest', async (request, reply) => {
    const timeout = setTimeout(() => {
      if (!reply.sent) {
        reply.status(408).send({
          success: false,
          error: {
            type: 'REQUEST_TIMEOUT',
            message: 'Request took too long to process',
            timestamp: new Date().toISOString(),
            path: request.url,
          },
          requestId: request.id
        });
      }
    }, 30000); // 30 second timeout

    reply.raw.on('finish', () => {
      clearTimeout(timeout);
    });
  });

  // 404 handler for undefined routes
  fastify.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const requestId = request.id || 'unknown';
    
    request.log.warn({
      url: request.url,
      method: request.method,
      ip: request.ip,
      requestId
    }, 'Route Not Found');

    return reply.status(404).send({
      success: false,
      error: {
        type: 'ROUTE_NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      requestId
    });
  });
}