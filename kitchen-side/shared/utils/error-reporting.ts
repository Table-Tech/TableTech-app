/**
 * Error Reporting Utility
 * Centralized error logging and reporting for the kitchen-side application
 */

interface ErrorData {
  message: string
  stack?: string
  componentStack?: string
  errorBoundary?: string
  level: 'page' | 'section' | 'component'
  timestamp: string
  userAgent: string
  url: string
  errorId: string
  userId?: string
  restaurantId?: string
  context?: Record<string, any>
}

interface ErrorReportingConfig {
  enabled: boolean
  maxStoredErrors: number
  endpoint?: string
  apiKey?: string
}

class ErrorReportingService {
  private config: ErrorReportingConfig
  private queue: ErrorData[] = []

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      maxStoredErrors: 50,
      ...config
    }
  }

  /**
   * Report an error to the service
   */
  async reportError(error: Error, context: {
    errorBoundary?: string
    level: 'page' | 'section' | 'component'
    componentStack?: string
    userId?: string
    restaurantId?: string
    additionalContext?: Record<string, any>
  }) {
    const errorData: ErrorData = {
      message: error.message,
      stack: error.stack,
      componentStack: context.componentStack,
      errorBoundary: context.errorBoundary,
      level: context.level,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      errorId: this.generateErrorId(),
      userId: context.userId,
      restaurantId: context.restaurantId,
      context: context.additionalContext
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Report - ${errorData.level.toUpperCase()}`)
      console.error('Message:', errorData.message)
      console.error('Component:', errorData.errorBoundary)
      console.error('Stack:', errorData.stack)
      if (errorData.componentStack) {
        console.error('Component Stack:', errorData.componentStack)
      }
      if (errorData.context) {
        console.error('Context:', errorData.context)
      }
      console.groupEnd()
    }

    // Store locally for debugging
    this.storeErrorLocally(errorData)

    // Send to external service in production
    if (this.config.enabled) {
      try {
        await this.sendToService(errorData)
      } catch (reportingError) {
        console.error('Failed to report error to service:', reportingError)
      }
    }

    return errorData.errorId
  }

  /**
   * Store error in localStorage for debugging
   */
  private storeErrorLocally(errorData: ErrorData) {
    if (typeof window === 'undefined') return

    try {
      const storageKey = 'kitchenErrorLogs'
      const existingErrors = JSON.parse(localStorage.getItem(storageKey) || '[]')
      
      // Add new error to beginning of array
      existingErrors.unshift(errorData)
      
      // Keep only the most recent errors
      const trimmedErrors = existingErrors.slice(0, this.config.maxStoredErrors)
      
      localStorage.setItem(storageKey, JSON.stringify(trimmedErrors))
    } catch (e) {
      console.error('Failed to store error locally:', e)
    }
  }

  /**
   * Send error to external reporting service
   */
  private async sendToService(errorData: ErrorData) {
    // TODO: Replace with your actual error reporting service
    // Examples: Sentry, LogRocket, Bugsnag, DataDog, etc.
    
    if (this.config.endpoint && this.config.apiKey) {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          ...errorData,
          service: 'kitchen-side',
          environment: process.env.NODE_ENV
        })
      })

      if (!response.ok) {
        throw new Error(`Error reporting failed: ${response.status}`)
      }
    } else {
      // Fallback: send to your own API endpoint
      console.log('Error would be sent to reporting service:', errorData)
    }
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get stored errors for debugging
   */
  getStoredErrors(): ErrorData[] {
    if (typeof window === 'undefined') return []

    try {
      return JSON.parse(localStorage.getItem('kitchenErrorLogs') || '[]')
    } catch (e) {
      console.error('Failed to retrieve stored errors:', e)
      return []
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem('kitchenErrorLogs')
    } catch (e) {
      console.error('Failed to clear stored errors:', e)
    }
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    byLevel: Record<string, number>
    byComponent: Record<string, number>
    recent: number
  } {
    const errors = this.getStoredErrors()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    return {
      total: errors.length,
      byLevel: errors.reduce((acc, error) => {
        acc[error.level] = (acc[error.level] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byComponent: errors.reduce((acc, error) => {
        const component = error.errorBoundary || 'Unknown'
        acc[component] = (acc[component] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recent: errors.filter(error => error.timestamp > oneHourAgo).length
    }
  }
}

// Create singleton instance
export const errorReportingService = new ErrorReportingService({
  // Configure based on environment
  enabled: process.env.NODE_ENV === 'production',
  maxStoredErrors: 100,
  // endpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
  // apiKey: process.env.NEXT_PUBLIC_ERROR_REPORTING_API_KEY,
})

// Convenience function for manual error reporting
export function reportError(
  error: Error, 
  component?: string, 
  level: 'page' | 'section' | 'component' = 'component',
  additionalContext?: Record<string, any>
) {
  return errorReportingService.reportError(error, {
    errorBoundary: component,
    level,
    additionalContext
  })
}

// Hook for getting error statistics (useful for admin dashboards)
export function useErrorStats() {
  if (typeof window === 'undefined') {
    return {
      total: 0,
      byLevel: {},
      byComponent: {},
      recent: 0
    }
  }

  return errorReportingService.getErrorStats()
}

export default errorReportingService