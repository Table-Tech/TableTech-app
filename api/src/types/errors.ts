import { ZodError, ZodIssue } from "zod";

// Custom error classes for different types of failures
export class ValidationError extends Error {
  public readonly statusCode = 400;
  public readonly type = 'VALIDATION_ERROR';
  public readonly details: any;

  constructor(message: string, details?: any) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class BusinessLogicError extends Error {
  public readonly statusCode = 422;
  public readonly type = 'BUSINESS_LOGIC_ERROR';
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'BusinessLogicError';
    this.code = code;
  }
}

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  public readonly type = 'AUTHENTICATION_ERROR';

  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  public readonly type = 'AUTHORIZATION_ERROR';
  public readonly requiredRole?: string;
  public readonly userRole?: string;

  constructor(message: string, requiredRole?: string, userRole?: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.requiredRole = requiredRole;
    this.userRole = userRole;
  }
}

export class ResourceNotFoundError extends Error {
  public readonly statusCode = 404;
  public readonly type = 'RESOURCE_NOT_FOUND';
  public readonly resource: string;

  constructor(resource: string, id?: string) {
    super(`${resource}${id ? ` with ID ${id}` : ''} not found`);
    this.name = 'ResourceNotFoundError';
    this.resource = resource;
  }
}

export class RateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly type = 'RATE_LIMIT_ERROR';
  public readonly retryAfter: number;

  constructor(retryAfter: number = 60) {
    super('Too many requests. Please try again later.');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

// Error response formatter
export interface ErrorResponse {
  error: {
    type: string;
    message: string;
    details?: any;
    timestamp: string;
    path?: string;
    requestId?: string;
  };
}

export class ErrorFormatter {
  static formatZodError(zodError: ZodError, path?: string): ErrorResponse {
    const fieldErrors: Record<string, string[]> = {};
    
    zodError.issues.forEach((issue: ZodIssue) => {
      const fieldPath = issue.path.join('.');
      if (!fieldErrors[fieldPath]) {
        fieldErrors[fieldPath] = [];
      }
      fieldErrors[fieldPath].push(issue.message);
    });

    return {
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          fields: fieldErrors,
          totalErrors: zodError.issues.length
        },
        timestamp: new Date().toISOString(),
        path
      }
    };
  }

  static formatCustomError(error: ValidationError | BusinessLogicError | AuthenticationError | AuthorizationError | ResourceNotFoundError | RateLimitError, path?: string, requestId?: string): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        type: error.type,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };

    if (path) response.error.path = path;
    if (requestId) response.error.requestId = requestId;

    // Add specific details for certain error types
    if (error instanceof ValidationError && error.details) {
      response.error.details = error.details;
    }

    if (error instanceof AuthorizationError) {
      response.error.details = {
        requiredRole: error.requiredRole,
        userRole: error.userRole
      };
    }

    if (error instanceof BusinessLogicError) {
      response.error.details = {
        code: (error as BusinessLogicError).code
      };
    }

    if (error instanceof RateLimitError) {
      response.error.details = {
        retryAfter: (error as RateLimitError).retryAfter
      };
    }

    return response;
  }

  static formatGenericError(error: Error, path?: string, requestId?: string): ErrorResponse {
    return {
      error: {
        type: 'INTERNAL_SERVER_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An unexpected error occurred' 
          : error.message,
        timestamp: new Date().toISOString(),
        path,
        requestId
      }
    };
  }
}