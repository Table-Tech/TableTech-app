"use client";

import { DashboardPage } from "@/features/dashboard";
import { useAuth } from '@/shared/hooks/useAuth';
import { LoadingSpinner } from '@/shared/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardMainPage() {
  const { user, currentRestaurantId, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    // Super Admins without restaurant selection should go to select page
    if (user.role === 'SUPER_ADMIN' && !currentRestaurantId) {
      router.push('/select');
      return;
    }
  }, [user, currentRestaurantId, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentRestaurantId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Restaurant Selected</h2>
          <p className="text-gray-600">Please select a restaurant to continue.</p>
        </div>
      </div>
    );
  }

  // Use currentRestaurantId instead of passing from URL params
  return <DashboardPage restaurantId={currentRestaurantId} />;
}