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

export type TableStatus = 'beschikbaar' | 'gereserveerd' | 'bezet' | 'rekening' | 'wachten' | 'schoonmaken';

export interface Table {
  id: number;
  name: string;
  status: TableStatus;
  guests?: number;
  time?: number; // minutes
  orders?: number;
  reservationTime?: string;
}

export const mockTables: Record<string, Table[]> = {
  r1: [
    { id: 1, name: 'Tafel 1', status: 'beschikbaar' },
    { id: 2, name: 'Tafel 2', status: 'bezet', guests: 4, time: 45, orders: 6 },
    { id: 3, name: 'Tafel 3', status: 'gereserveerd', guests: 6, reservationTime: '18:30' },
    { id: 4, name: 'Tafel 4', status: 'bezet', guests: 3, time: 65, orders: 8 },
    { id: 5, name: 'Tafel 5', status: 'beschikbaar' },
    { id: 6, name: 'Tafel 6', status: 'beschikbaar' },
    { id: 7, name: 'Tafel 7', status: 'gereserveerd', guests: 4, reservationTime: '19:45' },
    { id: 8, name: 'Tafel 8', status: 'bezet', guests: 2, time: 15, orders: 2 },
    { id: 9, name: 'Tafel 9', status: 'beschikbaar' },
    { id: 10, name: 'Tafel 10', status: 'schoonmaken', time: 5 },
    { id: 11, name: 'Tafel 11', status: 'beschikbaar' },
    { id: 12, name: 'Tafel 12', status: 'wachten' },
    { id: 13, name: 'Tafel 13', status: 'rekening', guests: 2, time: 10, orders: 1 },
  ],
  r2: [
    { id: 1, name: 'Tafel 1', status: 'beschikbaar' },
    { id: 2, name: 'Tafel 2', status: 'bezet', guests: 2, time: 30, orders: 2 },
    { id: 3, name: 'Tafel 3', status: 'gereserveerd', guests: 5, reservationTime: '17:45' },
    { id: 4, name: 'Tafel 4', status: 'bezet', guests: 3, time: 50, orders: 5 },
    { id: 5, name: 'Tafel 5', status: 'beschikbaar' },
    { id: 6, name: 'Tafel 6', status: 'beschikbaar' },
    { id: 7, name: 'Tafel 7', status: 'gereserveerd', guests: 2, reservationTime: '20:00' },
    { id: 8, name: 'Tafel 8', status: 'bezet', guests: 4, time: 10, orders: 1 },
    { id: 9, name: 'Tafel 9', status: 'beschikbaar' },
    { id: 10, name: 'Tafel 10', status: 'schoonmaken', time: 3 },
    { id: 11, name: 'Tafel 11', status: 'beschikbaar' },
    { id: 12, name: 'Tafel 12', status: 'beschikbaar' },
    { id: 13, name: 'Tafel 13', status: 'rekening', guests: 3, time: 8, orders: 2 },
  ],
};

export type MenuItem = {
  id: string;
  title: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
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
      { id: "m1", title: "Margherita pizza", price: 9.95, description: "Klassieke pizza met tomatensaus, mozzarella en basilicum", category: "Pizza", image: "/margherita.jpg",},
      { id: "m2", title: "Pepperoni pizza", price: 11.5, description: "Pikante pepperoni met mozzarella", category: "Pizza", image: "/pepperoni.jpg",},
      { id: "m5", title: "Cola", price: 2.5, description: "Fris en bruisend", category: "Drankjes", image: "/cola.jpg",},
      { id: "m2", title: "Spa Blauw", price: 2.0, description: "Plat mineraalwater", category: "Drankjes", image: "/spa.jpg",}
    ],
    r2: [
      { id: "m3", title: "Cheeseburger", price: 8.5, description: "Goed gevulde cheeseburger", category: "Burgers", image: "/cheeseburger.jpg",},
      { id: "m4", title: "Fries", price: 3.0, description: "Heerlijke franse frietjes", category: "Zij-gerecht", image: "/fries.jpg",},
      { id: "m5", title: "Cola", price: 2.5, description: "Fris en bruisend", category: "Drankjes", image: "/cola.jpg",},
      { id: "m6", title: "Spa Blauw", price: 2.0, description: "Plat mineraalwater", category: "Drankjes", image: "/spa.jpg",}
    ]
  };
  
  export const mockOrders: Record<string, Order[]> = {
    r1: [
      { id: "o1", table: 4, items: ["m1"], status: "pending" },
      { id: "o2", table: 8, items: ["m1", "m2"], status: "complete" }
    ],
    r2: [
      { id: "o3", table: 2, items: ["m3"], status: "pending" },
      { id: "o4", table: 5, items: ["m4", "m5"], status: "complete" }
    ]
  };
  