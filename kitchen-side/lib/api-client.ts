// Centralized API client for kitchen-side app
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get token from localStorage (if available)
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token');
    }

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{
      token: string;
      refreshToken: string;
      staff: {
        id: string;
        name: string;
        email: string;
        role: string;
        restaurant: {
          id: string;
          name: string;
        };
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request<{
      id: string;
      name: string;
      email: string;
      role: string;
      restaurant: {
        id: string;
        name: string;
      };
    }>('/auth/me');
  }

  // Restaurant endpoints
  async getRestaurants() {
    return this.request<Array<{
      id: string;
      name: string;
      logoUrl?: string;
      address: string;
      phone: string;
    }>>('/restaurants');
  }

  // Get all restaurants (SUPER_ADMIN only)
  async getAllRestaurants() {
    return this.request<Array<{
      id: string;
      name: string;
      logoUrl?: string;
      address: string;
      phone: string;
      taxRate: number;
    }>>('/restaurants');
  }

  async getRestaurant(id: string) {
    return this.request<{
      id: string;
      name: string;
      logoUrl?: string;
      address: string;
      phone: string;
      taxRate: number;
    }>(`/restaurants/${id}`);
  }

  // Menu endpoints
  async getMenuItems(restaurantId: string) {
    return this.request<Array<{
      id: string;
      name: string;
      description: string;
      price: number;
      isAvailable: boolean;
      category: {
        id: string;
        name: string;
      };
      modifierGroups?: Array<{
        id: string;
        name: string;
        required: boolean;
        modifiers: Array<{
          id: string;
          name: string;
          price: number;
        }>;
      }>;
    }>>(`/menu/staff/items?restaurantId=${restaurantId}`);
  }

  async getMenuCategories(restaurantId: string) {
    return this.request<Array<{
      id: string;
      name: string;
      description?: string;
      sortOrder: number;
    }>>(`/menu-categories/staff/categories?restaurantId=${restaurantId}`);
  }

  // Order endpoints
  async getOrders(restaurantId: string, status?: string) {
    const params = new URLSearchParams();
    params.append('restaurantId', restaurantId);
    if (status) params.append('status', status);
    
    return this.request<{
      orders: Array<{
        id: string;
        orderNumber: string;
        status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
        totalAmount: number;
        createdAt: string;
        table: {
          id: string;
          number: number;
          code: string;
        };
        orderItems: Array<{
          id: string;
          quantity: number;
          price: number;
          notes?: string;
          menuItem: {
            id: string;
            name: string;
            preparationTime?: number;
          };
          modifiers: Array<{
            modifier: {
              id: string;
              name: string;
              price: number;
            };
          }>;
        }>;
      }>;
      pagination: {
        total: number;
        limit: number;
        offset: number;
        pages: number;
      };
    }>(`/orders/staff/orders?${params.toString()}`);
  }

  async getKitchenOrders(restaurantId: string) {
    return this.request<Array<{
      id: string;
      orderNumber: string;
      status: 'CONFIRMED' | 'PREPARING';
      createdAt: string;
      table: {
        number: number;
      };
      orderItems: Array<{
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
      }>;
    }>>(`/orders/staff/kitchen?restaurantId=${restaurantId}`);
  }

  async updateOrderStatus(orderId: string, status: string, notes?: string) {
    return this.request(`/orders/staff/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  }

  // Table endpoints
  async getTables(restaurantId: string) {
    return this.request<Array<{
      id: string;
      number: number;
      code: string;
      status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
      capacity: number;
    }>>(`/tables/staff/tables?restaurantId=${restaurantId}`);
  }

  // Staff endpoints
  async getStaff(restaurantId: string) {
    return this.request<Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      isActive: boolean;
    }>>(`/staff/staff/members?restaurantId=${restaurantId}`);
  }

  // Statistics endpoints
  async getOrderStatistics(restaurantId: string) {
    return this.request<{
      totalOrders: number;
      todayOrders: number;
      activeOrders: number;
      todayRevenue: number;
    }>(`/orders/staff/statistics?restaurantId=${restaurantId}`);
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type {
  ApiResponse
};