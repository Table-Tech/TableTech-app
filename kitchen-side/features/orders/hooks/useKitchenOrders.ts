/**
 * Kitchen Orders Hook
 * Manages kitchen order data fetching and state
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/services/api-client';
import { KitchenOrder } from '../types';

export function useKitchenOrders(restaurantId: string) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getKitchenOrders(restaurantId);
      
      if (response.success && response.data) {
        setOrders(response.data);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching kitchen orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, notes?: string) => {
    try {
      const response = await apiClient.updateOrderStatus(orderId, status, notes);
      
      if (response.success) {
        // Refresh orders after status update
        await fetchOrders();
        return { success: true };
      } else {
        return { success: false, error: 'Failed to update order status' };
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      return { success: false, error: 'Network error' };
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [restaurantId]);

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    updateOrderStatus
  };
}