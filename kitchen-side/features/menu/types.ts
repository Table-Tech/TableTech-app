/**
 * Menu Feature Types
 * Type definitions specific to menu management
 */

export interface MenuFormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl?: string;
  available: boolean;
}

export interface CategoryFormData {
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface MenuFilters {
  category?: string;
  available?: boolean;
  search?: string;
}

export interface MenuStats {
  totalItems: number;
  availableItems: number;
  categories: number;
  averagePrice: number;
}