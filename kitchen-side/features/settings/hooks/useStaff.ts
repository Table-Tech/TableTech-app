/**
 * Staff Management Hook
 * Custom hook for staff CRUD operations
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/services/api-client';
import { useAuth } from '@/shared/contexts/AuthContext';

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';
  isActive: boolean;
  restaurantId?: string;
  restaurant?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStaffData {
  name: string;
  email: string;
  password: string;
  role: string;
  restaurantId: string;
}

export interface UpdateStaffData {
  name?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
}

export function useStaff() {
  const { selectedRestaurant } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStaff = async () => {
    if (!selectedRestaurant?.id) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getStaff(selectedRestaurant.id);
      
      if (response.success && response.data) {
        setStaff(response.data);
      } else {
        setError(response.error || 'Failed to fetch staff members');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching staff:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createStaff = async (data: CreateStaffData) => {
    try {
      setError(null);
      const response = await apiClient.createStaff({
        ...data,
        restaurantId: selectedRestaurant?.id || data.restaurantId
      });
      
      if (response.success) {
        await fetchStaff(); // Refresh the list
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to create staff member');
      }
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  };

  const updateStaff = async (id: string, data: UpdateStaffData) => {
    try {
      setError(null);
      const response = await apiClient.updateStaff(id, data);
      
      if (response.success) {
        await fetchStaff(); // Refresh the list
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to update staff member');
      }
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return;
    }

    try {
      setError(null);
      const response = await apiClient.deleteStaff(id);
      
      if (response.success) {
        await fetchStaff(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to delete staff member');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  };

  const toggleStaffStatus = async (id: string, isActive: boolean) => {
    try {
      await updateStaff(id, { isActive });
    } catch (error) {
      console.error('Error toggling staff status:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [selectedRestaurant?.id]);

  return {
    staff,
    isLoading,
    error,
    fetchStaff,
    createStaff,
    updateStaff,
    deleteStaff,
    toggleStaffStatus,
  };
}