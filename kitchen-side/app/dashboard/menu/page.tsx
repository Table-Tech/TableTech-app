"use client";

import { MenuPage } from '@/features/menu';
import { useAuth } from '@/shared/hooks/useAuth';

export default function MenuPageRoute() {
  const { currentRestaurantId } = useAuth();
  
  if (!currentRestaurantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Please select a restaurant to manage menu.</p>
      </div>
    );
  }
  
  return <MenuPage restaurantId={currentRestaurantId} />;
}
