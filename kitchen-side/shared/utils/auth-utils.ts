/**
 * Auth Utilities
 * Helper functions for authentication and authorization logic
 */

import { UserRole } from '@/shared/components/protection/types';

/**
 * Check if user has any of the required roles
 */
export function hasRequiredRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user can access a specific restaurant
 */
export function canAccessRestaurant(
  userRole: UserRole, 
  userRestaurantId: string | undefined, 
  targetRestaurantId: string
): boolean {
  // SUPER_ADMIN can access any restaurant
  if (userRole === 'SUPER_ADMIN') {
    return true;
  }
  
  // Other roles can only access their assigned restaurant
  return userRestaurantId === targetRestaurantId;
}

/**
 * Get user-friendly role name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Administrator',
    ADMIN: 'Administrator',
    MANAGER: 'Manager',
    CHEF: 'Chef',
    WAITER: 'Waiter',
    CASHIER: 'Cashier'
  };
  
  return roleNames[role] || role;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch {
    return true; // Invalid token format
  }
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: UserRole): number {
  const roleLevels: Record<UserRole, number> = {
    WAITER: 1,
    CASHIER: 1,
    CHEF: 2,
    MANAGER: 3,
    ADMIN: 4,
    SUPER_ADMIN: 5
  };
  
  return roleLevels[role] || 0;
}

/**
 * Check if user role has higher or equal permissions than required role
 */
export function hasMinimumRole(userRole: UserRole, minimumRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(minimumRole);
}