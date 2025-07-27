"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { MenuItem } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { MenuList } from "../../../../components/MenuList";

export default function MenuPage() {
  const params = useParams();
  const restaurantId = params?.restaurantId as string;
  const { user } = useAuth();
  
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) return;
      
      try {
        setIsLoading(true);
        const response = await apiClient.getMenuItems(restaurantId);
        
        if (response.success && response.data) {
          setMenu(response.data);
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

    fetchMenu();
  }, [restaurantId]);

  if (isLoading) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#f6fcff] min-h-screen">
        <div className="text-center text-red-600">
          <p>Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-[#f6fcff] min-h-screen">
      <MenuList menu={menu} setMenu={setMenu} canAdd={false} currentUser={user || undefined} />
    </div>
  );
}
