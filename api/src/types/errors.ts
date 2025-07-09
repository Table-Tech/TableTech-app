import { ZodError, ZodIssue } from "zod";

/**
 * Primary error class for all API errors
 * Provides consistent error handling across the application
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    public message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** Return the shape our error.middleware expects */
  serialize() {
    return {
      code: this.code,
      message: this.message
    };
  }
}

/**
 * Validation error for complex validation scenarios with structured details
 * Use only when you need to return multiple field errors or complex validation info
 */
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

/**
 * Business logic error for domain-specific rule violations
 * Use when business rules are violated and you need structured error codes
 */
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

  static formatCustomError(error: ValidationError | BusinessLogicError, path?: string, requestId?: string): ErrorResponse {
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

    if (error instanceof BusinessLogicError) {
      response.error.details = {
        code: error.code
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