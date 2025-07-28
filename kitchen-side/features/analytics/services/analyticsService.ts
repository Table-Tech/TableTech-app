import { apiClient } from '@/shared/services/api-client';
import type { AnalyticsData, AnalyticsFilters } from '../types';

class AnalyticsService {
  private baseUrl = '/analytics';

  async getAnalytics(restaurantId: string, filters?: AnalyticsFilters) {
    const params = new URLSearchParams();
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    if (filters?.period) params.set('period', filters.period);
    
    const query = params.toString();
    const url = `${this.baseUrl}?restaurantId=${restaurantId}${query ? `&${query}` : ''}`;
    
    return apiClient.get<AnalyticsData>(url);
  }

  async getRevenueReport(restaurantId: string, period: 'day' | 'week' | 'month' | 'year') {
    return apiClient.get<{ revenue: number; period: string }[]>(
      `${this.baseUrl}/revenue?restaurantId=${restaurantId}&period=${period}`
    );
  }

  async getPopularItems(restaurantId: string, limit = 10) {
    return apiClient.get<Array<{ id: string; name: string; orders: number; revenue: number }>>(
      `${this.baseUrl}/popular-items?restaurantId=${restaurantId}&limit=${limit}`
    );
  }
}

export const analyticsService = new AnalyticsService();