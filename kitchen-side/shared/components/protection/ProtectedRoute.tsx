/**
 * ProtectedRoute Component
 * Basic authentication wrapper - ensures user is logged in
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { ProtectedRouteProps } from './types';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Button } from '../ui/Button';

export function ProtectedRoute({ 
  children, 
  fallback, 
  redirectTo = '/login' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) return;
    
    // Redirect if not authenticated
    if (!isAuthenticated || !user) {
      router.push(redirectTo);
      return;
    }
  }, [isAuthenticated, isLoading, user, router, redirectTo]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Verifying authentication..." />
      </div>
    );
  }

  // Show fallback or redirect if not authenticated
  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to continue.</p>
          <Button onClick={() => router.push(redirectTo)}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}