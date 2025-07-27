"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { apiClient } from "@/shared/services/api-client";
import { MenuItem } from "@/shared/types";
import { useAuth } from "@/shared/hooks/useAuth";
import { MenuList } from "@/features/menu";
import { LoadingSpinner } from "@/shared/components/ui/LoadingSpinner";
import { Button } from "@/shared/components/ui/Button";

export default function MenuPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;
  const { user } = useAuth();
  
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getMenuItems(restaurantId);
      
      if (response.success && response.data) {
        // Transform API data to match MenuItem interface
        const transformedMenu = response.data.map((item: any) => ({
          ...item,
          available: item.isAvailable,
          categoryId: item.category.id,
          imageUrl: item.imageUrl || undefined,
        }));
        setMenu(transformedMenu);
      } else {
        setError('Failed to fetch menu items');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  if (isLoading) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text="Loading menu items..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <Button onClick={fetchMenu} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <MenuList menu={menu} setMenu={setMenu} canAdd={true} currentUser={user || undefined} />
    </div>
  );
}
