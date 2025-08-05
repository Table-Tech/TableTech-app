'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'
import { Button } from '@/shared/components/ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'section' | 'component'
  name?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
  errorId: string
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    
    // Update state with error info
    this.setState({
      error,
      errorInfo
    })

    // Report error to centralized error reporting service
    this.reportErrorToService(error, errorInfo)
  }

  private reportErrorToService = async (error: Error, errorInfo: React.ErrorInfo) => {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: this.props.name || 'Unknown',
      level: this.props.level || 'component',
      timestamp: new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'Unknown',
      errorId: this.state.errorId
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
      console.groupEnd()
    }

    // Store in localStorage for debugging
    if (typeof window !== 'undefined') {
      try {
        const existingErrors = JSON.parse(localStorage.getItem('kitchenErrorLogs') || '[]')
        existingErrors.unshift(errorData)
        // Keep only last 50 errors to prevent localStorage bloat
        const trimmedErrors = existingErrors.slice(0, 50)
        localStorage.setItem('kitchenErrorLogs', JSON.stringify(trimmedErrors))
      } catch (e) {
        console.error('Failed to store error in localStorage:', e)
      }
    }

    // TODO: In production, send to error reporting service like Sentry
    // Example: Sentry.captureException(error, { extra: errorData })
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    })
  }

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  private handleGoHome = () => {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard'
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Render different UI based on error boundary level
      const { level = 'component', name } = this.props
      const { error, errorId } = this.state

      if (level === 'page') {
        return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                Something went wrong
              </h1>
              
              <p className="text-gray-600 mb-6">
                We encountered an error while loading this page. Please try refreshing or go back to the dashboard.
              </p>

              <div className="space-y-3">
                <Button 
                  onClick={this.handleRetry}
                  className="w-full flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={this.handleGoHome}
                  className="w-full flex items-center justify-center"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                    <Bug className="w-4 h-4 inline mr-1" />
                    Error Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-800 overflow-auto max-h-40">
                    <p><strong>Error ID:</strong> {errorId}</p>
                    <p><strong>Component:</strong> {name || 'Unknown'}</p>
                    <p><strong>Message:</strong> {error?.message}</p>
                    {error?.stack && (
                      <div className="mt-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap">{error.stack}</pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        )
      }

      if (level === 'section') {
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
            <div className="flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              <h3 className="text-lg font-medium text-red-900">
                Section Error
              </h3>
            </div>
            
            <p className="text-red-700 mb-4">
              This section encountered an error and couldn't load properly.
            </p>

            <div className="flex space-x-3">
              <Button 
                size="sm"
                onClick={this.handleRetry}
                className="flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Retry
              </Button>
              
              <Button 
                size="sm"
                variant="outline"
                onClick={this.handleReload}
                className="flex items-center"
              >
                Reload Page
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800">
                  Show Error Details
                </summary>
                <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono text-red-800">
                  <p><strong>Error:</strong> {error?.message}</p>
                  <p><strong>Component:</strong> {name}</p>
                </div>
              </details>
            )}
          </div>
        )
      }

      // Component level error (default)
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 m-2">
          <div className="flex items-start">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-yellow-800">
                Component failed to load
              </p>
              <button 
                onClick={this.handleRetry}
                className="text-xs text-yellow-600 hover:text-yellow-800 underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Convenience wrapper for functional components
interface ErrorBoundaryWrapperProps {
  children: ReactNode
  level?: 'page' | 'section' | 'component'
  name?: string
  fallback?: ReactNode
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  )

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`
  
  return WithErrorBoundaryComponent
}

// Hook to access error boundary context (for manual error reporting)
export function useErrorHandler() {
  const throwError = (error: Error) => {
    throw error
  }

  const reportError = (error: Error, context?: string) => {
    console.error(`Manual error report${context ? ` from ${context}` : ''}:`, error)
    
    // In production, this would go to your error reporting service
    if (typeof window !== 'undefined') {
      try {
        const errorData = {
          message: error.message,
          stack: error.stack,
          context: context || 'Manual report',
          timestamp: new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' }),
          url: window.location.href
        }
        
        const existingErrors = JSON.parse(localStorage.getItem('manualErrorReports') || '[]')
        existingErrors.push(errorData)
        localStorage.setItem('manualErrorReports', JSON.stringify(existingErrors.slice(-10)))
      } catch (e) {
        console.error('Failed to store manual error report:', e)
      }
    }
  }

  return { throwError, reportError }
}