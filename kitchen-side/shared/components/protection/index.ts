/**
 * Protection Components Barrel Export
 * Clean import interface for all protection-related components
 */

// Main protection components
export { ProtectedRoute } from './ProtectedRoute';
export { RoleGuard } from './RoleGuard';
export { RestaurantGuard } from './RestaurantGuard';

// Types
export type {
  UserRole,
  User,
  AuthState,
  AuthContextType,
  ProtectedRouteProps,
  RoleGuardProps,
  RestaurantGuardProps
} from './types';

// Re-export auth utils for convenience
export {
  hasRequiredRole,
  canAccessRestaurant,
  getRoleDisplayName,
  isTokenExpired,
  getRoleLevel,
  hasMinimumRole
} from '@/shared/utils/auth-utils';

// Re-export auth hooks for convenience
export {
  useAuth,
  useRequireRole,
  useRestaurantAccess,
  usePermissions
} from '@/shared/hooks/useAuth';