"use client";

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';
import { LoadingSpinner } from '@/shared/components/ui';

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_ROUTES = ['/login', '/'];
const SUPER_ADMIN_ROUTES = ['/select', '/restaurant-select'];

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // Allow public routes without authentication
    if (PUBLIC_ROUTES.includes(pathname)) {
      // If already authenticated, redirect appropriately
      if (isAuthenticated && user) {
        if (user.role === 'SUPER_ADMIN') {
          router.push('/select');
        } else if (user.restaurant) {
          router.push(`/dashboard/${user.restaurant.id}`);
        }
      }
      return;
    }

    // All other routes require authentication
    if (!isAuthenticated || !user) {
      console.log('Not authenticated, redirecting to login');
      router.push('/login');
      return;
    }

    // Super Admin specific routing
    if (user.role === 'SUPER_ADMIN') {
      // Super admin trying to access dashboard without restaurant selection
      if (pathname.startsWith('/dashboard/') && !SUPER_ADMIN_ROUTES.includes(pathname)) {
        const restaurantId = pathname.split('/')[2];
        // Only redirect if they haven't selected a valid restaurant
        if (!restaurantId) {
          router.push('/select');
          return;
        }
      }
    } else {
      // Regular users shouldn't access super admin routes
      if (SUPER_ADMIN_ROUTES.includes(pathname)) {
        if (user.restaurant) {
          router.push(`/dashboard/${user.restaurant.id}`);
        } else {
          router.push('/login'); // Fallback if no restaurant
        }
        return;
      }

      // Regular users should only access their own restaurant
      if (pathname.startsWith('/dashboard/')) {
        const restaurantId = pathname.split('/')[2];
        if (restaurantId && user.restaurant && restaurantId !== user.restaurant.id) {
          router.push(`/dashboard/${user.restaurant.id}`);
          return;
        }
      }
    }
  }, [isLoading, isAuthenticated, user, pathname, router]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }

  // For protected routes, show loading if not authenticated (will redirect)
  if (!PUBLIC_ROUTES.includes(pathname) && (!isAuthenticated || !user)) {
    return (
      <div className="min-h-screen bg-[#f6fcff] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Redirecting..." />
      </div>
    );
  }

  return <>{children}</>;
}