/**
 * RoleGuard Component
 * Role-based access control - ensures user has required permissions
 */

'use client';

import { useRouter } from 'next/navigation';
import { useRequireRole } from '@/shared/hooks/useAuth';
import { RoleGuardProps } from './types';
import { getRoleDisplayName } from '@/shared/utils/auth-utils';
import { Button } from '../ui/Button';

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback,
  redirectTo = '/dashboard'
}: RoleGuardProps) {
  const { hasPermission, userRole, isAuthenticated } = useRequireRole(allowedRoles);
  const router = useRouter();

  // Don't render anything if not authenticated (ProtectedRoute should handle this)
  if (!isAuthenticated) {
    return null;
  }

  // User doesn't have required role
  if (!hasPermission) {
    // Use custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default access denied UI
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
          <p className="text-gray-600 mb-2">
            Your role <span className="font-semibold text-gray-800">
              {userRole ? getRoleDisplayName(userRole) : 'Unknown'}
            </span> doesn't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Required roles: {allowedRoles.map(getRoleDisplayName).join(', ')}
          </p>
          <div className="space-x-3">
            <Button variant="secondary" onClick={() => router.back()}>
              Go Back
            </Button>
            <Button onClick={() => router.push(redirectTo)}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // User has required role, render children
  return <>{children}</>;
}