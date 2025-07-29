/**
 * Categories Hook
 * Custom hook for menu category operations
 */

import { useState } from 'react';
import { apiClient } from '@/shared/services/api-client';
import { MenuCategory } from '@/shared/types';

export function useCategories(restaurantId: string) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getMenuCategories(restaurantId);
      
      if (response.success && response.data) {
        setCategories(response.data);
      } else {
        setError(response.error || 'Failed to fetch categories');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCategory = async (data: any) => {
    try {
      const response = await apiClient.createMenuCategory(restaurantId, data);
      if (response.success) {
        await fetchCategories(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  };

  const updateCategory = async (id: string, data: any) => {
    try {
      const response = await apiClient.updateMenuCategory(restaurantId, id, data);
      if (response.success) {
        await fetchCategories(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) {
      return;
    }

    try {
      const response = await apiClient.deleteMenuCategory(restaurantId, id);
      if (response.success) {
        await fetchCategories(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  };

  return {
    categories,
    isLoading,
    error,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}