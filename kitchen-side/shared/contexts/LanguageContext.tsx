"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Supported languages
export type Language = 'en' | 'nl';

// Translation interface structure
export interface Translations {
  // Common
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    back: string;
    next: string;
    search: string;
    filter: string;
    actions: string;
    status: string;
    name: string;
    description: string;
    price: string;
    email: string;
    phone: string;
    address: string;
  };
  
  // Navigation
  nav: {
    dashboard: string;
    orders: string;
    menu: string;
    tables: string;
    staff: string;
    settings: string;
    analytics: string;
    logout: string;
    switchRestaurant: string;
    signOut: string;
    selectRestaurant: string;
    language: string;
    languageSettings: string;
  };
  
  // Dashboard
  dashboard: {
    title: string;
    welcomeBack: string;
    todayRevenue: string;
    activeOrders: string;
    ordersToday: string;
    avgOrderValue: string;
    recentOrders: string;
    todayPerformance: string;
    revenueToday: string;
    systemStatus: string;
    kitchenDisplay: string;
    paymentSystem: string;
    qrOrdering: string;
    quickActions: string;
    viewMenu: string;
    manageTables: string;
    updateTableLayout: string;
    viewAllOrders: string;
    noRecentOrders: string;
    items: string;
    viewOrders: string;
    manageMenu: string;
    addNewItems: string;
    addMenuItem: string;
    createNewDish: string;
  };
  
  // Orders
  orders: {
    title: string;
    liveOrders: string;
    manageActiveOrders: string;
    newOrder: string;
    pending: string;
    confirmed: string;
    preparing: string;
    ready: string;
    delivered: string;
    completed: string;
    cancelled: string;
    table: string;
    orderNumber: string;
    total: string;
    time: string;
    loadingOrders: string;
    error: string;
    tryAgain: string;
    live: string;
    offline: string;
    creating: string;
    testOrder: string;
    refresh: string;
    noActiveOrders: string;
    newOrdersWillAppear: string;
    items: string;
    markAs: string;
    note: string;
  };
  
  // Tables
  tables: {
    title: string;
    addTable: string;
    tableNumber: string;
    capacity: string;
    qrCode: string;
    downloadQr: string;
    viewFullSize: string;
    available: string;
    occupied: string;
    reserved: string;
    maintenance: string;
    qrCodeNotAvailable: string;
    qrCodesGenerated: string;
    manageTablesDescription: string;
    live: string;
    offline: string;
    refresh: string;
    total: string;
    outOfOrder: string;
    searchTables: string;
    allStatuses: string;
    noTablesFound: string;
    createFirstTable: string;
    table: string;
    seats: string;
    code: string;
    viewQr: string;
    qrCodeFor: string;
    permanentQrCode: string;
    permanentQrDescription: string;
    customerUrl: string;
    customerUrlDescription: string;
  };
  
  // Menu
  menu: {
    // Page titles and headers
    title: string;
    menuManagement: string;
    loading: string;
    retry: string;
    pleaseSelectRestaurant: string;
    
    // Actions
    addMenuItem: string;
    addCategory: string;
    edit: string;
    hide: string;
    show: string;
    
    // Categories
    category: string;
    categories: string;
    filterByCategory: string;
    allItems: string;
    createNewCategory: string;
    
    // Item status
    available: string;
    unavailable: string;
    hidden: string;
    notVisibleToCustomers: string;
    
    // Visibility toggle
    showHidden: string;
    hideUnavailable: string;
    
    // Empty states
    noMenuItemsFound: string;
    startByAddingFirstItem: string;
    
    // Modal titles
    addNewMenuItem: string;
    editMenuItem: string;
    
    // Error states
    error: string;
  };
  
  // Restaurant
  restaurant: {
    selectRestaurant: string;
    addRestaurant: string;
    restaurantName: string;
    logoUrl: string;
    welcome: string;
    chooseRestaurant: string;
    noRestaurantsFound: string;
    noRestaurantsAvailable: string;
    createRestaurant: string;
    creating: string;
    requiredFields: string;
    tryAgain: string;
  };
  
  // Auth
  auth: {
    login: string;
    logout: string;
    email: string;
    password: string;
    forgotPassword: string;
    rememberMe: string;
    signIn: string;
  };
  
  // Validation & Errors
  validation: {
    required: string;
    invalidEmail: string;
    passwordTooShort: string;
    phoneInvalid: string;
    urlInvalid: string;
    networkError: string;
    apiNotRunning: string;
  };
  
  // Time & Dates
  time: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
    weeksAgo: string;
    monthsAgo: string;
  };
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>('en');
  const [translations, setTranslations] = useState<Translations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load translations dynamically
  const loadTranslations = async (lang: Language) => {
    setIsLoading(true);
    try {
      const translations = await import(`../translations/${lang}`);
      setTranslations(translations.default);
    } catch (error) {
      console.error(`Failed to load translations for ${lang}:`, error);
      // Fallback to English
      if (lang !== 'en') {
        const fallback = await import('../translations/en');
        setTranslations(fallback.default);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize language from localStorage or browser
  useEffect(() => {
    const savedLanguage = localStorage.getItem('dashboard-language') as Language;
    const browserLanguage = navigator.language.startsWith('nl') ? 'nl' : 'en';
    const initialLanguage = savedLanguage || browserLanguage;
    
    setLanguageState(initialLanguage);
    loadTranslations(initialLanguage);
  }, []);

  // Update language and save to localStorage
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('dashboard-language', lang);
    loadTranslations(lang);
  };

  // Fallback translations while loading - using actual English translations
  const fallbackTranslations: Translations = {
    common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', loading: 'Loading...', error: 'Error', success: 'Success', confirm: 'Confirm', back: 'Back', next: 'Next', search: 'Search', filter: 'Filter', actions: 'Actions', status: 'Status', name: 'Name', description: 'Description', price: 'Price', email: 'Email', phone: 'Phone', address: 'Address' },
    nav: { dashboard: 'Dashboard', orders: 'Orders', menu: 'Menu', tables: 'Tables', staff: 'Staff', settings: 'Settings', analytics: 'Analytics', logout: 'Logout', switchRestaurant: 'Switch Restaurant', signOut: 'Sign Out', selectRestaurant: 'Select restaurant', language: 'Language', languageSettings: 'Language Settings' },
    dashboard: { title: 'Dashboard', welcomeBack: 'Welcome back! Here\'s what\'s happening today.', todayRevenue: "Today's Revenue", activeOrders: 'Active Orders', ordersToday: 'Orders Today', avgOrderValue: 'Avg Order Value', recentOrders: 'Recent Orders', todayPerformance: "Today's Performance", revenueToday: 'Revenue Today', systemStatus: 'System Status', kitchenDisplay: 'Kitchen Display', paymentSystem: 'Payment System', qrOrdering: 'QR Ordering', quickActions: 'Quick Actions', viewMenu: 'View Menu', manageTables: 'Manage Tables', updateTableLayout: 'Update table layout', viewAllOrders: 'View all', noRecentOrders: 'No recent orders', items: 'items', viewOrders: 'View Orders', manageMenu: 'Manage Menu', addNewItems: 'Add new items to your menu', addMenuItem: 'Add Menu Item', createNewDish: 'Create a new dish' },
    orders: { title: 'Orders', liveOrders: 'Live Orders', manageActiveOrders: 'Manage active restaurant orders', newOrder: 'New Order', pending: 'Pending', confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready', delivered: 'Delivered', completed: 'Completed', cancelled: 'Cancelled', table: 'Table', orderNumber: 'Order', total: 'Total', time: 'Time', loadingOrders: 'Loading orders...', error: 'Error', tryAgain: 'Try Again', live: 'Live', offline: 'Offline', creating: 'Creating...', testOrder: 'Test Order', refresh: 'Refresh', noActiveOrders: 'No active orders', newOrdersWillAppear: 'New orders will appear here when customers place them.', items: 'items', markAs: 'Mark as', note: 'Note' },
    tables: { title: 'Tables', addTable: 'Add Table', tableNumber: 'Table Number', capacity: 'Capacity', qrCode: 'QR Code', downloadQr: 'Download QR', viewFullSize: 'View Full Size', available: 'Available', occupied: 'Occupied', reserved: 'Reserved', maintenance: 'Maintenance', qrCodeNotAvailable: 'QR code not available', qrCodesGenerated: 'QR codes are generated automatically when tables are created', manageTablesDescription: 'Manage restaurant tables and real-time status', live: 'Live', offline: 'Offline', refresh: 'Refresh', total: 'Total', outOfOrder: 'Out of Order', searchTables: 'Search tables...', allStatuses: 'All Statuses', noTablesFound: 'No tables found', createFirstTable: 'Create your first table to get started.', table: 'Table', seats: 'seats', code: 'Code', viewQr: 'View QR', qrCodeFor: 'QR Code - Table', permanentQrCode: 'Permanent QR Code', permanentQrDescription: 'This QR code is permanent and safe for printing on physical materials. It will never change unless manually regenerated by an admin.', customerUrl: 'Customer URL', customerUrlDescription: 'Customers will be redirected to this URL when they scan the QR code' },
    menu: { title: 'Menu', menuManagement: 'Menu Management', loading: 'Loading menu...', retry: 'Retry', pleaseSelectRestaurant: 'Please select a restaurant to manage menu.', addMenuItem: 'Add Menu Item', addCategory: 'Add Category', edit: 'Edit', hide: 'Hide', show: 'Show', category: 'Category', categories: 'Categories', filterByCategory: 'Filter by Category', allItems: 'All Items', createNewCategory: 'Create New Category', available: 'Available', unavailable: 'Unavailable', hidden: 'Hidden', notVisibleToCustomers: 'Not visible to customers', showHidden: 'Show Hidden', hideUnavailable: 'Hide Unavailable', noMenuItemsFound: 'No menu items found', startByAddingFirstItem: 'Start by adding your first menu item.', addNewMenuItem: 'Add New Menu Item', editMenuItem: 'Edit Menu Item', error: 'Error' },
    restaurant: { selectRestaurant: 'Select Restaurant', addRestaurant: 'Add Restaurant', restaurantName: 'Restaurant Name', logoUrl: 'Logo URL', welcome: 'Welcome', chooseRestaurant: 'choose a restaurant to manage', noRestaurantsFound: 'No restaurants found', noRestaurantsAvailable: 'No restaurants available in the system', createRestaurant: 'Create Restaurant', creating: 'Creating...', requiredFields: 'Required fields', tryAgain: 'Try again' },
    auth: { login: 'Login', logout: 'Logout', email: 'Email', password: 'Password', forgotPassword: 'Forgot Password', rememberMe: 'Remember Me', signIn: 'Sign In' },
    validation: { required: 'Required', invalidEmail: 'Invalid email', passwordTooShort: 'Password too short', phoneInvalid: 'Invalid phone number', urlInvalid: 'Invalid URL', networkError: 'Network error', apiNotRunning: 'make sure API is running' },
    time: { justNow: 'just now', minutesAgo: 'minutes ago', hoursAgo: 'hours ago', daysAgo: 'days ago', weeksAgo: 'weeks ago', monthsAgo: 'months ago' }
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations || fallbackTranslations,
    isLoading
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Utility hook for translations only
export function useTranslation() {
  const { t } = useLanguage();
  return t;
}