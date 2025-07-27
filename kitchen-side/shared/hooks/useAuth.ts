/**
 * Enhanced Authentication Hook
 * Centralized auth logic with role and restaurant access management
 */

import { useContext } from 'react';
import { AuthContext } from '@/shared/contexts/AuthContext';
import { AuthContextType, UserRole } from '@/shared/components/protection/types';
import { hasRequiredRole, canAccessRestaurant } from '@/shared/utils/auth-utils';

export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

/**
 * Hook for checking if user has required roles
 */
export function useRequireRole(allowedRoles: UserRole[]) {
  const { user, isAuthenticated } = useAuth();
  
  const hasPermission = isAuthenticated && user && hasRequiredRole(user.role, allowedRoles);
  
  return {
    hasPermission,
    userRole: user?.role,
    isAuthenticated
  };
}

/**
 * Hook for checking restaurant access
 */
export function useRestaurantAccess(restaurantId: string) {
  const { user, isAuthenticated } = useAuth();
  
  const hasAccess = isAuthenticated && user && canAccessRestaurant(
    user.role, 
    user.restaurant?.id, 
    restaurantId
  );
  
  return {
    hasAccess,
    userRole: user?.role,
    userRestaurantId: user?.restaurant?.id,
    isAuthenticated
  };
}

/**
 * Hook for combining role and restaurant checks
 */
export function usePermissions(allowedRoles: UserRole[], restaurantId?: string) {
  const { user, isAuthenticated } = useAuth();
  
  const hasRolePermission = isAuthenticated && user && hasRequiredRole(user.role, allowedRoles);
  
  const hasRestaurantAccess = !restaurantId || (
    isAuthenticated && user && canAccessRestaurant(
      user.role, 
      user.restaurant?.id, 
      restaurantId
    )
  );
  
  return {
    hasPermission: hasRolePermission && hasRestaurantAccess,
    hasRolePermission,
    hasRestaurantAccess,
    userRole: user?.role,
    isAuthenticated
  };
}