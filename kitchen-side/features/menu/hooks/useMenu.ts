/**
 * Menu Hook
 * Custom hook for menu management operations
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/services/api-client';
import { MenuItem } from '@/shared/types';

export function useMenu(restaurantId: string) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
        setError(response.error || 'Failed to fetch menu items');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching menu:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createMenuItem = async (data: any) => {
    try {
      const response = await apiClient.createMenuItem(restaurantId, data);
      if (response.success) {
        await fetchMenu(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to create menu item');
      }
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  };

  const updateMenuItem = async (id: string, data: any) => {
    try {
      const response = await apiClient.updateMenuItem(restaurantId, id, data);
      if (response.success) {
        await fetchMenu(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update menu item');
      }
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  };

  const deleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return;
    }

    try {
      const response = await apiClient.deleteMenuItem(restaurantId, id);
      if (response.success) {
        await fetchMenu(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to delete menu item');
      }
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [restaurantId]);

  return {
    menu,
    isLoading,
    error,
    fetchMenu,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
  };
}