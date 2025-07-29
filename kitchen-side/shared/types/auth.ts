/**
 * Authentication & Authorization Types
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';
  restaurant?: {
    id: string;
    name: string;
  };
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  staff: User;
}