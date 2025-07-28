/**
 * Component Props Types
 */

import { KitchenOrder, MenuItem, Table } from '.';

export interface DashboardLayoutProps {
  restaurantId: string;
  children: React.ReactNode;
}

export interface OrderCardProps {
  order: KitchenOrder;
  onStatusUpdate: (orderId: string, status: string) => void;
}

export interface MenuItemCardProps {
  item: MenuItem;
  onToggleAvailability: (itemId: string, available: boolean) => void;
  onEdit: (item: MenuItem) => void;
}

export interface TableCardProps {
  table: Table;
  onStatusUpdate: (tableId: string, status: string) => void;
}