// lib/mockdata.ts
export type OrganizationSettings = {
  name: string
  email: string
  phone: string
  kvk: string
  goLiveDate: string
  active: boolean
  logo: string
}

export const mockOrganizationSettings: Record<string, OrganizationSettings> = {
  r1: {
    name: "Pizza Palace",
    email: "info@PizzaPalace.com",
    phone: "010-1234567",
    kvk: "12345678",
    goLiveDate: "2024-01-01",
    active: true,
    logo: "/PizzaPalace.jpg", // staat in /public
  },
  r2: {
    name: "Burger Bistro",
    email: "info@BurgerBistro.com",
    phone: "020-7654321",
    kvk: "87654321",
    goLiveDate: "2024-06-01",
    active: false,
    logo: "/BurgerBistro.jpg",
  },
}

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
  description?: string;
  image?: string;
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
      email: "admin@PizzaPalace.com",
      role: "ADMIN",
      restaurantId: "r1"
    },
    {
      id: "2",
      email: "user@PizzaPalace.com",
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
    { id: "r1", name: "Pizza Palace", logo: "/PizzaPalace.jpg" },
    { id: "r2", name: "Burger Bistro", logo: "/BurgerBistro.jpg" }
  ];
  
  export const mockMenuItems: Record<string, MenuItem[]> = {
    r1: [
      { id: "m1", title: "Margherita pizza", price: 9.95, description: "Klassieke pizza met tomatensaus, mozzarella en basilicum", image: "/margherita.jpg",},
      { id: "m2", title: "Pepperoni pizza", price: 11.5, description: "Pikante pepperoni met mozzarella", image: "/pepperoni.jpg",},
      { id: "m5", title: "Cola", price: 2.5, description: "Fris en bruisend", image: "/cola.jpg",},
      { id: "m2", title: "Spa Blauw", price: 2.0, description: "Plat mineraalwater", image: "/spa.jpg",}
    ],
    r2: [
      { id: "m3", title: "Cheeseburger", price: 8.5 },
      { id: "m4", title: "Fries", price: 3.0 },
      { id: "m5", title: "Cola", price: 2.5, description: "Fris en bruisend", image: "/cola.jpg",},
      { id: "m6", title: "Spa Blauw", price: 2.0, description: "Plat mineraalwater", image: "/spa.jpg",}
    ]
  };
  
  export const mockOrders: Record<string, Order[]> = {
    r1: [
      { id: "o1", table: 4, items: ["m1"], status: "pending" },
      { id: "o2", table: 8, items: ["m1", "m2"], status: "complete" }
    ]
  };
  