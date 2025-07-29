/**
 * Order Status Hook
 * Manages order status updates and validation
 */

import { useState } from 'react';
import { apiClient } from '@/shared/services/api-client';

export function useOrderStatus() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStatus = async (orderId: string, newStatus: string, notes?: string) => {
    setIsUpdating(true);
    
    try {
      const response = await apiClient.updateOrderStatus(orderId, newStatus, notes);
      
      if (response.success) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: response.error || 'Failed to update order status' 
        };
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      return { 
        success: false, 
        error: 'Network error' 
      };
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-yellow-100 text-yellow-700';
      case 'PREPARING':
        return 'bg-blue-100 text-blue-700';
      case 'READY':
        return 'bg-green-100 text-green-700';
      case 'COMPLETED':
        return 'bg-gray-100 text-gray-700';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'CONFIRMED':
        return 'PREPARING';
      case 'PREPARING':
        return 'READY';
      case 'READY':
        return 'COMPLETED';
      default:
        return null;
    }
  };

  return {
    updateStatus,
    getStatusColor,
    getNextStatus,
    isUpdating
  };
}