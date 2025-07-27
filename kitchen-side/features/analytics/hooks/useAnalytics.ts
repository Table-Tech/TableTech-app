import { useState, useEffect, useCallback } from 'react';
import { analyticsService } from '../services/analyticsService';
import { useAuth } from '@/shared/hooks/useAuth';
import type { AnalyticsData, AnalyticsFilters } from '../types';

export function useAnalytics(filters?: AnalyticsFilters) {
  const { currentRestaurantId } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!currentRestaurantId) return;

    try {
      setLoading(true);
      setError(null);
      const analyticsData = await analyticsService.getAnalytics(currentRestaurantId, filters);
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  }, [currentRestaurantId, filters]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics
  };
}