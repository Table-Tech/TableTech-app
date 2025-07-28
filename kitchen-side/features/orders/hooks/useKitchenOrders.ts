/**
 * Kitchen Orders Hook
 * Manages kitchen order data fetching and state with real-time WebSocket updates
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/services/api-client';
import { useWebSocket } from '@/shared/services/websocket-client';
import { KitchenOrder } from '../types';

export function useKitchenOrders(restaurantId: string) {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subscribe } = useWebSocket(restaurantId);

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

  // Subscribe to WebSocket events for real-time updates
  useEffect(() => {
    if (!restaurantId || !subscribe) return;

    console.log('🔔 Setting up WebSocket subscriptions for kitchen orders...');

    // Subscribe to new orders
    const unsubscribeNewOrder = subscribe('order:new', (data) => {
      const order = data.order;
      console.log('🔔 WebSocket - New order received in kitchen hook:', data);
      
      // Add new order to the list if it's in kitchen status
      if (['PENDING', 'CONFIRMED', 'PREPARING'].includes(order.status)) {
        setOrders(prev => {
          // Check if order already exists to avoid duplicates
          const exists = prev.some(o => o.id === order.id);
          if (exists) return prev;
          return [order, ...prev];
        });
      }
    });

    // Subscribe to order status updates
    const unsubscribeStatusUpdate = subscribe('order:status', ({ orderId, status }) => {
      console.log('🔔 WebSocket - Order status update in kitchen hook:', orderId, status);
      setOrders(prev => prev.map(order => {
        if (order.id === orderId) {
          // If status is READY, COMPLETED or CANCELLED, remove from kitchen orders
          if (['READY', 'COMPLETED', 'CANCELLED'].includes(status)) {
            return null;
          }
          return { ...order, status };
        }
        return order;
      }).filter(Boolean) as KitchenOrder[]);
    });

    // Subscribe to order cancellations
    const unsubscribeOrderCancelled = subscribe('order:cancelled', ({ orderId }) => {
      console.log('🔔 WebSocket - Order cancelled in kitchen hook:', orderId);
      setOrders(prev => prev.filter(order => order.id !== orderId));
    });

    // Cleanup subscriptions
    return () => {
      unsubscribeNewOrder();
      unsubscribeStatusUpdate();
      unsubscribeOrderCancelled();
    };
  }, [restaurantId, subscribe]);

  return {
    orders,
    isLoading,
    error,
    fetchOrders,
    updateOrderStatus
  };
}