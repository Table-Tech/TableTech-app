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
    limit: 20,
    offset: 0,
    pages: 0
  });

  const fetchOrders = async () => {
    if (!restaurantId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Convert filters to API format
      const apiFilters = filters ? {
        status: filters.status,
        paymentStatus: filters.paymentStatus,
        dateFilter: filters.dateFilter || 'today', // Default to today
        excludeStatuses: filters.excludeStatuses,
        from: filters.from,
        to: filters.to,
        limit: pagination.limit,
        offset: pagination.offset
      } : {
        dateFilter: 'today' as const, // Default: today's orders only
        limit: pagination.limit,
        offset: pagination.offset
      };
      
      const response = await apiClient.getOrders(restaurantId, apiFilters);
      
      if (response.success && response.data) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      } else {
        setError('Failed to fetch orders');
      }
    } catch (error) {
      setError('Network error');
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching orders:', error);
      }
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