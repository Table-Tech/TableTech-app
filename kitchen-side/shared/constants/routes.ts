export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SELECT: '/select',
  RESTAURANT_SELECT: '/restaurant-select',
  DASHBOARD: (restaurantId: string) => `/dashboard/${restaurantId}`,
  ORDERS: (restaurantId: string) => `/dashboard/${restaurantId}`,
  MENU: (restaurantId: string) => `/dashboard/${restaurantId}/menu`,
  TABLES: (restaurantId: string) => `/dashboard/${restaurantId}/tables`,
  STATISTICS: (restaurantId: string) => `/dashboard/${restaurantId}/statistics`,
  SETTINGS: (restaurantId: string) => `/dashboard/${restaurantId}/beheer`
} as const;

export const API_ROUTES = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    ME: '/auth/me'
  },
  ORDERS: '/orders',
  MENU: '/menu',
  CATEGORIES: '/menu-categories',
  TABLES: '/tables',
  RESTAURANTS: '/restaurants',
  STAFF: '/staff'
} as const;