export interface AnalyticsData {
  revenue: {
    today: number;
    week: number;
    month: number;
    year: number;
  };
  orders: {
    today: number;
    week: number;
    month: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  tables: {
    total: number;
    occupied: number;
    available: number;
    reserved: number;
  };
  popularItems: Array<{
    id: string;
    name: string;
    orders: number;
    revenue: number;
  }>;
  hourlyStats: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  weeklyStats: Array<{
    day: string;
    orders: number;
    revenue: number;
  }>;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
}