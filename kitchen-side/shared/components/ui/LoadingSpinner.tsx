interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const LoadingSpinner = ({ size = 'md', className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]} ${className}`} />
  )
}

export const DashboardLoading = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <LoadingSpinner size="lg" className="mx-auto mb-4" />
      <p className="text-gray-600">Loading dashboard...</p>
    </div>
  </div>
)

export const PageLoading = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <LoadingSpinner className="mx-auto mb-4" />
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
)