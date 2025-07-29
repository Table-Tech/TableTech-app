import { apiClient } from '@/shared/services/api-client';
import type { Order, OrderStatus, CreateOrderPayload, UpdateOrderPayload } from '@/shared/types';

class OrderService {
  private baseUrl = '/orders';

  async getOrders(restaurantId: string, filters?: {
    status?: OrderStatus;
    tableId?: string;
    date?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.tableId) params.set('tableId', filters.tableId);
    if (filters?.date) params.set('date', filters.date);
    
    const query = params.toString();
    const url = `${this.baseUrl}?restaurantId=${restaurantId}${query ? `&${query}` : ''}`;
    
    return apiClient.get<Order[]>(url);
  }

  async getOrderById(orderId: string) {
    return apiClient.get<Order>(`${this.baseUrl}/${orderId}`);
  }

  async createOrder(payload: CreateOrderPayload) {
    return apiClient.post<Order>(this.baseUrl, payload);
  }

  async updateOrder(orderId: string, payload: UpdateOrderPayload) {
    return apiClient.patch<Order>(`${this.baseUrl}/${orderId}`, payload);
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return apiClient.patch<Order>(`${this.baseUrl}/${orderId}/status`, { status });
  }

  async deleteOrder(orderId: string) {
    return apiClient.delete(`${this.baseUrl}/${orderId}`);
  }

  async getKitchenOrders(restaurantId: string) {
    return apiClient.get<Order[]>(`${this.baseUrl}/kitchen?restaurantId=${restaurantId}`);
  }
}

export const orderService = new OrderService();