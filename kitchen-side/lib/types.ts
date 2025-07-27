// TypeScript types for the kitchen-side app

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CHEF' | 'WAITER' | 'CASHIER';
  restaurant?: {
    id: string;
    name: string;
  };
}

export interface Restaurant {
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  taxRate: number;
}

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
  preparationTime?: number;
  category: MenuCategory;
  modifierGroups?: ModifierGroup[];
}

export interface Table {
  id: string;
  number: number;
  code: string;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
  capacity: number;
}

export interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  notes?: string;
  status?: 'PENDING' | 'PREPARING' | 'READY';
  menuItem: {
    id: string;
    name: string;
    preparationTime?: number;
  };
  modifiers: Array<{
    modifier: Modifier;
  }>;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  table: Table;
  orderItems: OrderItem[];
}

export interface KitchenOrder {
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
}

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface OrderStatistics {
  totalOrders: number;
  todayOrders: number;
  activeOrders: number;
  todayRevenue: number;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  staff: User;
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'NEW_ORDER' | 'ORDER_STATUS_UPDATE' | 'ORDER_CANCELLED';
  data: any;
}

// Component prop types
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