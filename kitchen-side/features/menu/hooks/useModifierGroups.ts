/**
 * Modifier Groups Hook
 * Custom hook for modifier group operations
 */

import { useState } from 'react';
import { apiClient } from '@/shared/services/api-client';

export interface ModifierGroup {
  id: string;
  name: string;
  restaurantId: string;
  required: boolean;
  multiSelect: boolean;
  minSelect: number;
  maxSelect?: number;
  displayOrder: number;
  isActive: boolean;
  modifiers: Modifier[];
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
  displayOrder: number;
  isActive: boolean;
  modifierGroupId: string;
}

export interface CreateModifierGroupData {
  name: string;
  restaurantId: string;
  required: boolean;
  multiSelect: boolean;
  minSelect: number;
  maxSelect?: number;
  displayOrder: number;
}

export function useModifierGroups(restaurantId: string) {
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModifierGroups = async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getModifierGroups(restaurantId);
      if (response.success && response.data) {
        setModifierGroups(response.data);
      } else {
        setError(response.error || 'Failed to fetch modifier groups');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching modifier groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createModifierGroup = async (data: CreateModifierGroupData) => {
    try {
      const response = await apiClient.createModifierGroup(data);
      if (response.success) {
        await fetchModifierGroups(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to create modifier group');
      }
    } catch (error) {
      console.error('Error creating modifier group:', error);
      throw error;
    }
  };

  const updateModifierGroup = async (id: string, data: Partial<CreateModifierGroupData>) => {
    try {
      const response = await apiClient.updateModifierGroup(id, data);
      if (response.success) {
        await fetchModifierGroups(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update modifier group');
      }
    } catch (error) {
      console.error('Error updating modifier group:', error);
      throw error;
    }
  };

  const deleteModifierGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this modifier group and all its options?')) {
      return;
    }

    try {
      const response = await apiClient.deleteModifierGroup(id);
      if (response.success) {
        await fetchModifierGroups(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to delete modifier group');
      }
    } catch (error) {
      console.error('Error deleting modifier group:', error);
      throw error;
    }
  };

  return {
    modifierGroups,
    isLoading,
    error,
    fetchModifierGroups,
    createModifierGroup,
    updateModifierGroup,
    deleteModifierGroup,
  };
}