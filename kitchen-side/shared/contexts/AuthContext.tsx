"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/services/api-client';
import { User } from '@/shared/types';
import { UserRole, hasRequiredRole, canAccessRestaurant } from '@/shared/components/protection';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedRestaurantId: string | null;
  restaurant: { id: string; name: string } | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  selectRestaurant: (restaurantId: string) => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessRestaurant: (restaurantId: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check for stored auth on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedRestaurantId = localStorage.getItem('selectedRestaurantId');

    if (storedToken && storedUser) {
      const userData = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(userData);
      
      // For regular users, use their restaurant ID
      // For SUPER_ADMIN, use stored selection or null
      if (userData.role === 'SUPER_ADMIN') {
        setSelectedRestaurantId(storedRestaurantId);
      } else if (userData.restaurant) {
        setSelectedRestaurantId(userData.restaurant.id);
      }
    }
    
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        const { token: newToken, staff } = response.data;
        
        // Store in state
        setToken(newToken);
        setUser(staff as User);
        
        // Store in localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(staff));
        
        // Handle restaurant selection based on role
        if (staff.role === 'SUPER_ADMIN') {
          // SUPER_ADMIN needs to select a restaurant
          setSelectedRestaurantId(null);
          localStorage.removeItem('selectedRestaurantId');
        } else if (staff.restaurant) {
          // Regular users auto-select their restaurant
          setSelectedRestaurantId(staff.restaurant.id);
          localStorage.setItem('selectedRestaurantId', staff.restaurant.id);
        }
        
        // Clear any cached data
        localStorage.removeItem('mockUser');
        
        // Handle post-login redirect
        if (staff.role === 'SUPER_ADMIN') {
          // SUPER_ADMIN goes to restaurant selection
          router.push('/select');
        } else if (staff.restaurant) {
          // Regular users go to their restaurant dashboard
          router.push(`/dashboard/${staff.restaurant.id}`);
        }
        
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error || 'Login failed' 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: 'Network error - make sure API is running' 
      };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setSelectedRestaurantId(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedRestaurantId');
    localStorage.removeItem('mockUser'); // Clean up cached data
    router.push('/login');
  };

  const selectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    localStorage.setItem('selectedRestaurantId', restaurantId);
  };

  const refreshUser = async () => {
    if (!token) return;
    
    try {
      const response = await apiClient.getCurrentUser();
      if (response.success && response.data) {
        setUser(response.data as User);
        localStorage.setItem('user', JSON.stringify(response.data));
      } else {
        // Token might be invalid, logout
        logout();
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      logout();
    }
  };

  // Helper functions for protection components
  const hasRole = (roles: UserRole[]) => {
    return user ? hasRequiredRole(user.role as UserRole, roles) : false;
  };

  const canUserAccessRestaurant = (restaurantId: string) => {
    return user ? canAccessRestaurant(user.role as UserRole, user.restaurant?.id, restaurantId) : false;
  };

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    selectedRestaurantId,
    restaurant: selectedRestaurantId && user?.restaurant ? user.restaurant : null,
    login,
    logout,
    refreshUser,
    selectRestaurant,
    hasRole,
    canAccessRestaurant: canUserAccessRestaurant,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !user) {
        router.push('/login');
      }
    }, [user, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return null; // Will redirect to login
    }

    return <Component {...props} />;
  };
}