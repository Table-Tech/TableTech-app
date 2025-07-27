'use client';

import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/shared/components/layout';
import { ProtectedRoute, RestaurantGuard } from '@/shared/components/protection';

export default function Layout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;

  return (
    <ProtectedRoute>
      <RestaurantGuard restaurantId={restaurantId}>
        <DashboardLayout>{children}</DashboardLayout>
      </RestaurantGuard>
    </ProtectedRoute>
  );
}