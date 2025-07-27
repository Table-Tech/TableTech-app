"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { LoadingSpinner } from '@/shared/components/ui';

interface RequireAuthProps {
  children: React.ReactNode;
  roles?: string[];
  redirectTo?: string;
}

export function RequireAuth({ 
  children, 
  roles = [], 
  redirectTo = '/login' 
}: RequireAuthProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated || !user) {
      router.push(redirectTo);
      return;
    }

    // Check role requirements
    if (roles.length > 0 && !roles.includes(user.role)) {
      // User doesn't have required role, redirect to appropriate page
      if (user.role === 'SUPER_ADMIN') {
        router.push('/select');
      } else if (user.restaurant) {
        router.push(`/dashboard/${user.restaurant.id}`);
      } else {
        router.push('/login');
      }
      return;
    }
  }, [isLoading, isAuthenticated, user, roles, router, redirectTo]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Checking permissions..." />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting to login..." />
      </div>
    );
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting..." />
      </div>
    );
  }

  return <>{children}</>;
}