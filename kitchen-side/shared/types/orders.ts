/**
 * Orders & Kitchen Types
 */

import { Modifier, MenuItem } from './menu';
import { Table } from './tables';

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

export interface OrderStatistics {
  totalOrders: number;
  todayOrders: number;
  activeOrders: number;
  todayRevenue: number;
}