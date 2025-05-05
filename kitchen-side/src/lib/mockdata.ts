// lib/mockdata.ts
export type TableStatus = 'leeg' | 'gereserveerd' | 'bezet' | 'rekening' | 'wachten';

export interface Table {
  id: number;
  name: string;
  status: TableStatus;
}

export const mockTables: Record<string, Table[]> = {
  r1: [
    { id: 1, name: 'Tafel 1', status: 'leeg' },
    { id: 2, name: 'Tafel 2', status: 'bezet' },
    { id: 3, name: 'Tafel 3', status: 'rekening' },
    { id: 4, name: 'Tafel 4', status: 'wachten' },
    { id: 5, name: 'Tafel 5', status: 'gereserveerd' },
  ],
  r2: [
    { id: 1, name: 'Tafel 1', status: 'leeg' },
    { id: 2, name: 'Tafel 2', status: 'bezet' },
    { id: 3, name: 'Tafel 3', status: 'rekening' },
    { id: 4, name: 'Tafel 4', status: 'wachten' },
    { id: 5, name: 'Tafel 5', status: 'gereserveerd' },
  ],
};

export type MenuItem = {
  id: string;
  title: string;
  price: number;
};

export type Order = {
  id: string;
  table: number;
  items: string[];
  status: string;
};

export const mockUsers = [
    {
      id: "1",
      email: "admin@restaurant1.com",
      role: "ADMIN",
      restaurantId: "r1"
    },
    {
      id: "2",
      email: "user@restaurant1.com",
      role: "USER",
      restaurantId: "r1"
    },
    {
      id: "3",
      email: "superuser@tabletech.nl",
      role: "SUPER",
      restaurantId: null
    }
  ];
  
  export const mockRestaurants = [
    { id: "r1", name: "Pizza Palace" },
    { id: "r2", name: "Burger Bistro" }
  ];
  
  export const mockMenuItems: Record<string, MenuItem[]> = {
    r1: [
      { id: "m1", title: "Margherita", price: 9.95 },
      { id: "m2", title: "Pepperoni", price: 11.5 }
    ],
    r2: [
      { id: "m3", title: "Cheeseburger", price: 8.5 },
      { id: "m4", title: "Fries", price: 3.0 }
    ]
  };
  
  export const mockOrders: Record<string, Order[]> = {
    r1: [
      { id: "o1", table: 4, items: ["m1"], status: "pending" },
      { id: "o2", table: 8, items: ["m1", "m2"], status: "complete" }
    ]
  };
  