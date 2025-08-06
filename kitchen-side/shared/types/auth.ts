/**
 * Authentication & Authorization Types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';
  restaurantId?: string | null;
  sessionId?: string; // Session ID for tracking user sessions
  restaurant?: {
    id: string;
    name: string;
  };
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  staff: User; // Backwards compatibility
  user: User;  // New standard format
}