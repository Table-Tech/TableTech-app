/**
 * RestaurantGuard Component
 * Restaurant access control - ensures user can access specific restaurant
 */

'use client';

import { useRouter } from 'next/navigation';
import { useRestaurantAccess } from '@/shared/hooks/useAuth';
import { RestaurantGuardProps } from './types';
import { Button } from '../ui/Button';

export function RestaurantGuard({ 
  children, 
  restaurantId,
  fallback,
  redirectTo = '/select'
}: RestaurantGuardProps) {
  const { hasAccess, userRole, userRestaurantId, isAuthenticated } = useRestaurantAccess(restaurantId);
  const router = useRouter();

  // Don't render anything if not authenticated (ProtectedRoute should handle this)
  if (!isAuthenticated) {
    return null;
  }

  // User doesn't have access to this restaurant
  if (!hasAccess) {
    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default restaurant access denied UI
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-orange-500 text-6xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Restaurant Access Denied</h2>
          <p className="text-gray-600 mb-2">
            You don't have permission to access this restaurant.
          </p>
          {userRole !== 'SUPER_ADMIN' && (
            <p className="text-sm text-gray-500 mb-2">
              Your assigned restaurant: {userRestaurantId || 'None'}
            </p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            Requested restaurant: {restaurantId}
          </p>
          <div className="space-x-3">
            <Button variant="secondary" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => router.push(redirectTo)}>
              Select Restaurant
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // User has access to this restaurant, render children
  return <>{children}</>;
}