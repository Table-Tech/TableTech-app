/**
 * Protection Types
 * Centralized type definitions for authentication and authorization
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  restaurant?: {
    id: string;
    name: string;
  };
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export interface RestaurantGuardProps {
  children: React.ReactNode;
  restaurantId: string;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export interface AuthContextType extends AuthState {
  selectedRestaurantId: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  selectRestaurant: (restaurantId: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessRestaurant: (restaurantId: string) => boolean;
}