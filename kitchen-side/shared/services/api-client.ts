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
    
    // Get token and restaurant context from localStorage (if available)
    let token: string | null = null;
    let selectedRestaurant: any = null;
    
    if (typeof window !== 'undefined') {
      token = localStorage.getItem('token');
      const selectedRestaurantStr = localStorage.getItem('selectedRestaurant');
      if (selectedRestaurantStr) {
        try {
          selectedRestaurant = JSON.parse(selectedRestaurantStr);
        } catch (e) {
          // Ignore invalid JSON
        }
      }
    }

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders.Authorization = `Bearer ${token}`;
    }

    // Add restaurant context header for Super Admins
    if (selectedRestaurant?.id) {
      defaultHeaders['X-Restaurant-Context'] = selectedRestaurant.id;
    }

    try {
      console.log('Making request to:', url);
      console.log('With headers:', { ...defaultHeaders, ...options.headers });
      console.log('With options:', options);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        data = { error: 'Invalid JSON response', rawResponse: responseText };
      }

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired or invalid
        if (response.status === 401 && endpoint !== '/auth/refresh') {
          // Try to refresh token once before giving up
          try {
            const refreshResponse = await this.refreshToken();
            if (refreshResponse.success && refreshResponse.data) {
              // Update stored tokens
              if (typeof window !== 'undefined') {
                localStorage.setItem('token', refreshResponse.data.token);
                localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
              }
              
              // Retry the original request with new token
              return this.request(endpoint, {
                ...options,
                headers: {
                  ...options.headers,
                  Authorization: `Bearer ${refreshResponse.data.token}`,
                },
              });
            } else {
              // Refresh token failed, log the reason
              console.log('Token refresh failed:', refreshResponse.error);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
          
          // If refresh failed, clear auth data and trigger logout
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            localStorage.removeItem('selectedRestaurantId');
            // Dispatch custom event to notify AuthContext
            window.dispatchEvent(new CustomEvent('auth:logout'));
          }
        }
        
        return {
          success: false,
          error: data.error?.message || data.message || `HTTP ${response.status}`,
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

  // Generic HTTP methods for service classes
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await this.request<T>(endpoint, { ...options, method: 'GET' });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }

  async patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }

  async put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
    }
    return response.data as T;
  }

  async delete(endpoint: string, options?: RequestInit): Promise<void> {
    const response = await this.request(endpoint, { ...options, method: 'DELETE' });
    if (!response.success) {
      throw new Error(response.error || 'Request failed');
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

  async refreshToken() {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
    if (!refreshToken) {
      // Instead of throwing an error, return a failed response
      // This allows the calling code to handle it gracefully
      return {
        success: false,
        error: 'No refresh token available - user needs to login again'
      };
    }

    return this.request<{
      token: string;
      refreshToken: string;
    }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
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
    }>>('/restaurants/staff/restaurants');
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
    }>(`/restaurants/staff/restaurants/${id}`);
  }

  // Create restaurant (SUPER_ADMIN and ADMIN only)
  async createRestaurant(data: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    logoUrl?: string;
  }) {
    return this.request<{
      id: string;
      name: string;
      email?: string;
      phone?: string;
      address?: string;
      logoUrl?: string;
      taxRate: number;
      currency: string;
      timezone: string;
      isActive: boolean;
    }>('/restaurants/staff/restaurants', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  async createMenuItem(restaurantId: string, data: any) {
    console.log('API Client: Creating menu item');
    console.log('URL:', `/menu/staff/items`);
    console.log('Data:', data);
    console.log('Full URL:', `${this.baseUrl}/menu/staff/items`);
    const response = await this.request(`/menu/staff/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    console.log('Raw API Response:', response);
    return response;
  }

  async updateMenuItem(restaurantId: string, id: string, data: any) {
    return this.request(`/menu/staff/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMenuItem(restaurantId: string, id: string) {
    return this.request(`/menu/staff/items/${id}`, {
      method: 'DELETE',
    });
  }

  async updateMenuItemAvailability(restaurantId: string, id: string, isAvailable: boolean, availabilityNote?: string) {
    return this.request(`/menu/staff/items/${id}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({
        isAvailable,
        availabilityNote
      }),
    });
  }

  async createMenuCategory(restaurantId: string, data: any) {
    return this.request(`/menu-categories/staff/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMenuCategory(restaurantId: string, id: string, data: any) {
    return this.request(`/menu-categories/staff/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMenuCategory(restaurantId: string, id: string) {
    return this.request(`/menu-categories/staff/categories/${id}`, {
      method: 'DELETE',
    });
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
    }>>(`/staff/tables?restaurantId=${restaurantId}`);
  }

  async createTable(data: { number: number; capacity: number; restaurantId: string }) {
    return this.request<{
      id: string;
      number: number;
      capacity: number;
      status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
      restaurantId: string;
      code: string; // Add permanent table code
      qrCodeUrl?: string; // Add permanent QR code URL
      currentOrderId?: string;
      createdAt: string;
      updatedAt: string;
    }>('/staff/tables', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  // Test order creation for WebSocket testing
  async createTestOrder(restaurantId: string, tableId: string, menuItemId: string) {
    return this.request(`/orders/staff/orders`, {
      method: 'POST',
      body: JSON.stringify({
        tableId: tableId,
        restaurantId: restaurantId,
        items: [
          {
            menuId: menuItemId,
            quantity: 2,
            notes: "Test order for WebSocket"
          }
        ],
        notes: "WebSocket test order"
      }),
    });
  }

  // Modifier Group endpoints
  async getModifierGroups(restaurantId: string) {
    return this.request<Array<{
      id: string;
      name: string;
      required: boolean;
      maxSelections: number;
      modifiers: Array<{
        id: string;
        name: string;
        price: number;
        isAvailable: boolean;
      }>;
    }>>(`/modifier-groups/staff/modifier-groups?restaurantId=${restaurantId}`);
  }

  async createModifierGroup(data: any) {
    return this.request('/modifier-groups/staff/modifier-groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateModifierGroup(id: string, data: any) {
    return this.request(`/modifier-groups/staff/modifier-groups/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteModifierGroup(id: string) {
    return this.request(`/modifier-groups/staff/modifier-groups/${id}`, {
      method: 'DELETE',
    });
  }

  // Modifier endpoints
  async getModifiers(restaurantId: string, modifierGroupId?: string) {
    const params = new URLSearchParams();
    params.append('restaurantId', restaurantId);
    if (modifierGroupId) params.append('modifierGroupId', modifierGroupId);
    
    return this.request<Array<{
      id: string;
      name: string;
      price: number;
      isAvailable: boolean;
      modifierGroupId: string;
    }>>(`/modifiers/staff/modifiers?${params.toString()}`);
  }

  async createModifier(data: any) {
    return this.request('/modifiers/staff/modifiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateModifier(id: string, data: any) {
    return this.request(`/modifiers/staff/modifiers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteModifier(id: string) {
    return this.request(`/modifiers/staff/modifiers/${id}`, {
      method: 'DELETE',
    });
  }

  // Session endpoints (for customer sessions)
  async createSession(tableCode: string, restaurantId: string) {
    return this.request<{
      sessionToken: string;
      tableId: string;
      tableNumber: number;
      restaurantId: string;
      expiresAt: string;
    }>('/sessions/create', {
      method: 'POST',
      body: JSON.stringify({ tableCode, restaurantId }),
    });
  }

  async validateSession(sessionToken: string) {
    return this.request<{
      valid: boolean;
      tableId?: string;
      tableNumber?: number;
      restaurantId?: string;
      restaurant?: {
        id: string;
        name: string;
        logoUrl?: string;
      };
    }>(`/sessions/validate/${sessionToken}`);
  }

  async getSessionOrders(sessionToken: string) {
    return this.request<Array<{
      id: string;
      orderNumber: string;
      status: string;
      totalAmount: number;
      createdAt: string;
    }>>(`/sessions/${sessionToken}/orders`);
  }

  async extendSession(sessionToken: string) {
    return this.request<{
      expiresAt: string;
    }>(`/sessions/${sessionToken}/extend`, {
      method: 'POST',
    });
  }

  async endSession(sessionToken: string) {
    return this.request(`/sessions/${sessionToken}/end`, {
      method: 'POST',
    });
  }

  // Payment endpoints (primarily for customer use)
  async createPayment(orderId: string, returnUrl: string) {
    return this.request<{
      paymentId: string;
      checkoutUrl: string;
    }>('/payments/create', {
      method: 'POST',
      body: JSON.stringify({ orderId, returnUrl }),
    });
  }

  async checkPaymentStatus(paymentId: string) {
    return this.request<{
      status: 'pending' | 'paid' | 'failed' | 'expired' | 'canceled';
      orderId: string;
      amount: number;
    }>(`/payments/status/${paymentId}`);
  }

  // Staff management endpoints  
  async createStaff(data: any) {
    return this.request('/staff/staff/members', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStaff(id: string, data: any) {
    return this.request(`/staff/staff/members/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteStaff(id: string) {
    return this.request(`/staff/staff/members/${id}`, {
      method: 'DELETE',
    });
  }

  async changeStaffPassword(currentPassword: string, newPassword: string) {
    return this.request('/staff/staff/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type {
  ApiResponse
};