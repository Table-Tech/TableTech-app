/**
 * Menu & Food Items Types
 */

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder?: number;
}

export interface Modifier {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  available: boolean; // Alias for backwards compatibility
  preparationTime?: number;
  category: MenuCategory;
  categoryId: string; // For form compatibility
  imageUrl?: string;
  modifierGroups?: ModifierGroup[];
}

export interface CreateMenuItemPayload {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  restaurantId: string;
  isAvailable?: boolean;
  preparationTime?: number;
  imageUrl?: string;
  modifierGroupIds?: string[];
}

export interface UpdateMenuItemPayload {
  name?: string;
  description?: string;
  price?: number;
  categoryId?: string;
  isAvailable?: boolean;
  preparationTime?: number;
  imageUrl?: string;
  modifierGroupIds?: string[];
}