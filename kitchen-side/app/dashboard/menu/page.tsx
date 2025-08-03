"use client";

import { MenuPage } from '@/features/menu';
import { useAuth } from '@/shared/hooks/useAuth';
import { useTranslation } from '@/shared/contexts/LanguageContext';

export default function MenuPageRoute() {
  const { currentRestaurantId } = useAuth();
  const t = useTranslation();
  
  if (!currentRestaurantId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t.menu.pleaseSelectRestaurant}</p>
      </div>
    );
  }
  
  return <MenuPage restaurantId={currentRestaurantId} />;
}
