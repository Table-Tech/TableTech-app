import { apiClient } from '@/shared/services/api-client';
import type { Table, CreateTablePayload, UpdateTablePayload, TableFilters } from '../types';

class TableService {
  private baseUrl = '/staff/tables';

  async getTables(filters?: TableFilters) {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.capacity) params.set('capacity', filters.capacity.toString());
    if (filters?.search) params.set('search', filters.search);
    
    const query = params.toString();
    const url = `${this.baseUrl}${query ? `?${query}` : ''}`;
    
    return apiClient.get<Table[]>(url);
  }

  async getTableById(tableId: string) {
    return apiClient.get<Table>(`${this.baseUrl}/${tableId}`);
  }

  async createTable(payload: CreateTablePayload) {
    return apiClient.post<Table>(this.baseUrl, payload);
  }

  async updateTable(tableId: string, payload: UpdateTablePayload) {
    return apiClient.patch<Table>(`${this.baseUrl}/${tableId}`, payload);
  }

  async deleteTable(tableId: string) {
    return apiClient.delete(`${this.baseUrl}/${tableId}`);
  }

  async generateQRCode(tableId: string) {
    return apiClient.post<{ qrCodeUrl: string }>(`${this.baseUrl}/${tableId}/qr-code`);
  }
}

export const tableService = new TableService();