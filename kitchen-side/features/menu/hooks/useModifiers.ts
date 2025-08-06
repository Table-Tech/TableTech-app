/**
 * Modifiers Hook
 * Custom hook for individual modifier operations
 */

import { useState } from 'react';
import { apiClient } from '@/shared/services/api-client';

export interface Modifier {
  id: string;
  name: string;
  price: number;
  displayOrder: number;
  isActive: boolean;
  modifierGroupId: string;
}

export interface CreateModifierData {
  name: string;
  modifierGroupId: string;
  price: number;
  displayOrder: number;
}

export function useModifiers(modifierGroupId: string) {
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModifiers = async () => {
    if (!modifierGroupId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.getModifiers(modifierGroupId);
      if (response.success && response.data) {
        setModifiers(response.data);
      } else {
        setError(response.error || 'Failed to fetch modifiers');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching modifiers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createModifier = async (data: CreateModifierData) => {
    try {
      const response = await apiClient.createModifier(data);
      if (response.success) {
        await fetchModifiers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to create modifier');
      }
    } catch (error) {
      console.error('Error creating modifier:', error);
      throw error;
    }
  };

  const updateModifier = async (id: string, data: Partial<CreateModifierData>) => {
    try {
      const response = await apiClient.updateModifier(id, data);
      if (response.success) {
        await fetchModifiers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update modifier');
      }
    } catch (error) {
      console.error('Error updating modifier:', error);
      throw error;
    }
  };

  const deleteModifier = async (id: string) => {
    if (!confirm('Are you sure you want to delete this modifier option?')) {
      return;
    }

    try {
      const response = await apiClient.deleteModifier(id);
      if (response.success) {
        await fetchModifiers(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to delete modifier');
      }
    } catch (error) {
      console.error('Error deleting modifier:', error);
      throw error;
    }
  };

  return {
    modifiers,
    isLoading,
    error,
    fetchModifiers,
    createModifier,
    updateModifier,
    deleteModifier,
  };
}