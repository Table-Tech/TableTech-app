/**
 * Error Reporting Utility for Client-Side Application
 * Centralized error logging with Amsterdam timezone
 */

import { formatDateTimeAmsterdam } from './date';

interface ErrorData {
  message: string;
  stack?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  errorId: string;
  context?: Record<string, any>;
}

interface ErrorReportingConfig {
  enabled: boolean;
  maxStoredErrors: number;
  endpoint?: string;
}

class ErrorReportingService {
  private config: ErrorReportingConfig;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      maxStoredErrors: 50,
      ...config
    };
  }

  /**
   * Report an error to the service
   */
  async reportError(error: Error, context?: Record<string, any>) {
    const errorData: ErrorData = {
      message: error.message,
      stack: error.stack,
      timestamp: formatDateTimeAmsterdam(new Date()),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      errorId: this.generateErrorId(),
      context
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Client Error Report`);
      console.error('Message:', errorData.message);
      console.error('Timestamp (Amsterdam):', errorData.timestamp);
      console.error('Stack:', errorData.stack);
      if (errorData.context) {
        console.error('Context:', errorData.context);
      }
      console.groupEnd();
    }

    // Store locally for debugging
    this.storeErrorLocally(errorData);

    // Send to external service in production
    if (this.config.enabled) {
      try {
        await this.sendToService(errorData);
      } catch (reportingError) {
        console.error('Failed to report error to service:', reportingError);
      }
    }

    return errorData.errorId;
  }

  /**
   * Store error in localStorage for debugging
   */
  private storeErrorLocally(errorData: ErrorData) {
    if (typeof window === 'undefined') return;

    try {
      const storageKey = 'clientErrorLogs';
      const existingErrors = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Add new error to beginning of array
      existingErrors.unshift(errorData);
      
      // Keep only the most recent errors
      const trimmedErrors = existingErrors.slice(0, this.config.maxStoredErrors);
      
      localStorage.setItem(storageKey, JSON.stringify(trimmedErrors));
    } catch (e) {
      console.error('Failed to store error locally:', e);
    }
  }

  /**
   * Send error to external reporting service
   */
  private async sendToService(errorData: ErrorData) {
    // TODO: Replace with your actual error reporting service
    // For now, just log that it would be sent
    console.log('Error would be sent to reporting service:', errorData);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `client_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get stored errors for debugging
   */
  getStoredErrors(): ErrorData[] {
    if (typeof window === 'undefined') return [];

    try {
      return JSON.parse(localStorage.getItem('clientErrorLogs') || '[]');
    } catch (e) {
      console.error('Failed to retrieve stored errors:', e);
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem('clientErrorLogs');
    } catch (e) {
      console.error('Failed to clear stored errors:', e);
    }
  }
}

// Create singleton instance
export const errorReportingService = new ErrorReportingService({
  enabled: process.env.NODE_ENV === 'production',
  maxStoredErrors: 100,
});

// Convenience function for manual error reporting
export function reportError(
  error: Error, 
  context?: Record<string, any>
) {
  return errorReportingService.reportError(error, context);
}

export default errorReportingService;