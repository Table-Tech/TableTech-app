import { apiClient } from '@/shared/services/api-client';
import type { MenuItem, MenuCategory, CreateMenuItemPayload, UpdateMenuItemPayload } from '@/shared/types';

class MenuService {
  private baseUrl = '/menu';
  private categoriesUrl = '/menu-categories';

  async getMenuItems(restaurantId: string, filters?: {
    categoryId?: string;
    available?: boolean;
    search?: string;
  }) {
    const params = new URLSearchParams();
    if (filters?.categoryId) params.set('categoryId', filters.categoryId);
    if (filters?.available !== undefined) params.set('available', filters.available.toString());
    if (filters?.search) params.set('search', filters.search);
    
    const query = params.toString();
    const url = `${this.baseUrl}?restaurantId=${restaurantId}${query ? `&${query}` : ''}`;
    
    return apiClient.get<MenuItem[]>(url);
  }

  async getMenuItemById(itemId: string) {
    return apiClient.get<MenuItem>(`${this.baseUrl}/${itemId}`);
  }

  async createMenuItem(payload: CreateMenuItemPayload) {
    return apiClient.post<MenuItem>(this.baseUrl, payload);
  }

  async updateMenuItem(itemId: string, payload: UpdateMenuItemPayload) {
    return apiClient.patch<MenuItem>(`${this.baseUrl}/${itemId}`, payload);
  }

  async deleteMenuItem(itemId: string) {
    return apiClient.delete(`${this.baseUrl}/${itemId}`);
  }

  async getCategories(restaurantId: string) {
    return apiClient.get<MenuCategory[]>(`${this.categoriesUrl}?restaurantId=${restaurantId}`);
  }

  async createCategory(payload: { name: string; restaurantId: string; displayOrder?: number }) {
    return apiClient.post<MenuCategory>(this.categoriesUrl, payload);
  }

  async updateCategory(categoryId: string, payload: { name?: string; displayOrder?: number }) {
    return apiClient.patch<MenuCategory>(`${this.categoriesUrl}/${categoryId}`, payload);
  }

  async deleteCategory(categoryId: string) {
    return apiClient.delete(`${this.categoriesUrl}/${categoryId}`);
  }
}

export const menuService = new MenuService();