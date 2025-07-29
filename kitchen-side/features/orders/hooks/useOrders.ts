/**
 * Orders Hook
 * General order management hook
 */

import { useState, useEffect } from 'react';
import { apiClient } from '@/shared/services/api-client';
import { OrderFilters } from '../types';

export function useOrders(restaurantId: string, filters?: OrderFilters) {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    pages: 0
  });

  const fetchOrders = async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getOrders(restaurantId, filters?.status);
      
      if (response.success && response.data) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      setError('Network error');
      console.error('Error fetching orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [restaurantId, filters]);

  return {
    orders,
    pagination,
    isLoading,
    error,
    fetchOrders
  };
}