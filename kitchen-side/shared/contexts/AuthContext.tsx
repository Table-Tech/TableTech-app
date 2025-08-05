"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/shared/services/api-client';
import { User, Restaurant } from '@/shared/types';
import { UserRole, hasRequiredRole, canAccessRestaurant } from '@/shared/components/protection';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedRestaurant: Restaurant | null;
  currentRestaurantId: string | null; // Either user's restaurant or selected restaurant
  availableRestaurants: Restaurant[];
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  selectRestaurant: (restaurant: Restaurant) => void;
  clearRestaurantSelection: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessRestaurant: (restaurantId: string) => boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [availableRestaurants, setAvailableRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Computed value for current restaurant ID
  const currentRestaurantId = user?.restaurant?.id || selectedRestaurant?.id || null;

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('AuthContext: initializeAuth started');
      // Check for stored auth on mount
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const storedSelectedRestaurant = localStorage.getItem('selectedRestaurant');

      console.log('AuthContext: stored data check - token:', !!storedToken, 'user:', !!storedUser);

      // If no token or user data, stop loading immediately
      if (!storedToken || !storedUser) {
        console.log('AuthContext: No stored auth data, stopping loading');
        setIsLoading(false);
        return;
      }

      try {
        // Parse stored user data first
        const userData = JSON.parse(storedUser);
        
        // Set the user data from localStorage immediately (optimistic)
        setToken(storedToken);
        setUser(userData as User);
        
        // Handle restaurant selection based on user role
        if (userData.role === 'SUPER_ADMIN') {
          // Restore selected restaurant if stored
          if (storedSelectedRestaurant) {
            try {
              const selectedRestaurantData = JSON.parse(storedSelectedRestaurant);
              setSelectedRestaurant(selectedRestaurantData);
            } catch (e) {
              localStorage.removeItem('selectedRestaurant');
            }
          }
        }
        
        // Stop loading immediately so user can interact with the app
        console.log('AuthContext: Setting user data and stopping loading');
        setIsLoading(false);
        
        // Validate token in the background (don't block UI)
        try {
          const response = await apiClient.getCurrentUser();
          
          if (response.success && response.data) {
            // Update with fresh user data from server
            setUser(response.data as User);
            
            // Load available restaurants for Super Admin in background
            if (userData.role === 'SUPER_ADMIN') {
              await loadAvailableRestaurants();
            }
          } else {
            // Token is invalid, clear auth data
            clearAuthData();
          }
        } catch (error) {
          console.error('Background token validation failed:', error);
          // Only clear auth data if it's a 401 or other auth-related error
          if (error instanceof Error && error.message.includes('401')) {
            clearAuthData();
          }
        }
        
      } catch (error) {
        console.error('AuthContext: Failed to parse stored user data:', error);
        clearAuthData();
        setIsLoading(false);
      }
    };

    // Helper function to clear all auth data
    const clearAuthData = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('sessionId'); // Clear session ID
      localStorage.removeItem('selectedRestaurant');
      setToken(null);
      setUser(null);
      setSelectedRestaurant(null);
      setAvailableRestaurants([]);
    };

    initializeAuth();

    // Listen for automatic logout events from API client
    const handleAutoLogout = () => {
      setUser(null);
      setToken(null);
      setSelectedRestaurant(null);
      router.push('/login');
    };

    window.addEventListener('auth:logout', handleAutoLogout);

    // Cleanup
    return () => {
      window.removeEventListener('auth:logout', handleAutoLogout);
    };
  }, [router]);

  // Load available restaurants for Super Admin
  const loadAvailableRestaurants = async () => {
    try {
      const response = await apiClient.get<Restaurant[]>('/restaurants');
      if (response) {
        setAvailableRestaurants(response);
      }
    } catch (error) {
      console.error('Failed to load restaurants:', error);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        const { token: newToken, refreshToken, staff, user } = response.data;
        
        // Use the new user object if available (has sessionId), otherwise fall back to staff
        const userData = user || staff;
        
        // Store in state
        setToken(newToken);
        setUser(userData as User);
        
        // Store in localStorage
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Store sessionId separately for easy access
        if (userData.sessionId) {
          localStorage.setItem('sessionId', userData.sessionId);
        }
        
        // Handle restaurant selection based on role
        if (staff.role === 'SUPER_ADMIN') {
          // SUPER_ADMIN needs to select a restaurant
          setSelectedRestaurant(null);
          localStorage.removeItem('selectedRestaurant');
        }
        // Regular users don't need restaurant selection - it's in their user data
        
        // Clear any cached data
        localStorage.removeItem('mockUser');
        
        // Handle post-login redirect
        if (staff.role === 'SUPER_ADMIN') {
          // Load available restaurants for Super Admin and go to selection
          await loadAvailableRestaurants();
          router.push('/select');
        } else if (staff.restaurant) {
          // Regular users go to main dashboard
          router.push('/dashboard');
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
    setSelectedRestaurant(null);
    setAvailableRestaurants([]);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sessionId'); // Clear session ID
    localStorage.removeItem('selectedRestaurant');
    localStorage.removeItem('mockUser'); // Clean up cached data
    router.push('/login');
  };

  const selectRestaurant = (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant);
    localStorage.setItem('selectedRestaurant', JSON.stringify(restaurant));
    
    // For Super Admins, redirect to main dashboard after selection
    if (user?.role === 'SUPER_ADMIN') {
      router.push('/dashboard');
    }
  };

  const clearRestaurantSelection = () => {
    setSelectedRestaurant(null);
    localStorage.removeItem('selectedRestaurant');
    
    // For Super Admins, redirect back to selection page
    if (user?.role === 'SUPER_ADMIN') {
      router.push('/select');
    }
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
    selectedRestaurant,
    currentRestaurantId,
    availableRestaurants,
    login,
    logout,
    refreshUser,
    selectRestaurant,
    clearRestaurantSelection,
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