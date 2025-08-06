/**
 * Orders Feature Types
 */

export interface KitchenOrder {
  id: string;
  orderNumber: string;
  status: 'CONFIRMED' | 'PREPARING' | 'READY';
  createdAt: string;
  table: {
    number: number;
  };
  orderItems: OrderItem[];
}

export interface OrderItem {
  id: string;
  quantity: number;
  notes?: string;
  status: 'PENDING' | 'PREPARING' | 'READY';
  menuItem: {
    name: string;
    preparationTime?: number;
  };
  modifiers: Array<{
    modifier: {
      name: string;
    };
  }>;
}

export interface OrderStatistics {
  totalOrders: number;
  todayOrders: number;
  activeOrders: number;
  todayRevenue: number;
}

export interface OrderFilters {
  status?: string;
  paymentStatus?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  dateFilter?: 'today' | 'yesterday' | 'week' | 'month' | 'all';
  excludeStatuses?: string[];
  tableNumber?: number;
  startDate?: Date;
  endDate?: Date;
  from?: string;
  to?: string;
}