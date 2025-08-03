import { Translations } from '../contexts/LanguageContext';

const nl: Translations = {
  // Common
  common: {
    save: 'Opslaan',
    cancel: 'Annuleren',
    delete: 'Verwijderen',
    edit: 'Bewerken',
    add: 'Toevoegen',
    loading: 'Laden...',
    error: 'Fout',
    success: 'Succes',
    confirm: 'Bevestigen',
    back: 'Terug',
    next: 'Volgende',
    search: 'Zoeken',
    filter: 'Filteren',
    actions: 'Acties',
    status: 'Status',
    name: 'Naam',
    description: 'Beschrijving',
    price: 'Prijs',
    email: 'E-mail',
    phone: 'Telefoon',
    address: 'Adres',
  },
  
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    orders: 'Bestellingen',
    menu: 'Menu',
    tables: 'Tafels',
    staff: 'Personeel',
    settings: 'Instellingen',
    analytics: 'Analytics',
    logout: 'Uitloggen',
    switchRestaurant: 'Wissel Restaurant',
    signOut: 'Uitloggen',
    selectRestaurant: 'Selecteer restaurant',
    language: 'Taal',
    languageSettings: 'Taalinstellingen',
  },
  
  // Dashboard
  dashboard: {
    title: 'Dashboard',
    welcomeBack: 'Welkom terug! Dit is wat er vandaag gebeurt.',
    todayRevenue: 'Omzet Vandaag',
    activeOrders: 'Actieve Bestellingen',
    ordersToday: 'Bestellingen Vandaag',
    avgOrderValue: 'Gem. Bestelwaarde',
    recentOrders: 'Recente Bestellingen',
    todayPerformance: 'Prestaties Vandaag',
    revenueToday: 'Omzet Vandaag',
    systemStatus: 'Systeemstatus',
    kitchenDisplay: 'Keuken Display',
    paymentSystem: 'Betaalsysteem',
    qrOrdering: 'QR Bestellen',
    quickActions: 'Snelle Acties',
    viewMenu: 'Bekijk Menu',
    manageTables: 'Beheer Tafels',
    updateTableLayout: 'Tafelindeling bijwerken',
    viewAllOrders: 'Bekijk alle',
    noRecentOrders: 'Geen recente bestellingen',
    items: 'items',
    viewOrders: 'Bekijk Bestellingen',
    manageMenu: 'Beheer Menu',
    addNewItems: 'Voeg nieuwe items toe aan uw menu',
    addMenuItem: 'Menu Item Toevoegen',
    createNewDish: 'Maak een nieuw gerecht',
  },
  
  // Orders
  orders: {
    title: 'Bestellingen',
    liveOrders: 'Live Bestellingen',
    manageActiveOrders: 'Beheer actieve restaurantbestellingen',
    newOrder: 'Nieuwe Bestelling',
    pending: 'In Behandeling',
    confirmed: 'Bevestigd',
    preparing: 'In Voorbereiding',
    ready: 'Klaar',
    delivered: 'Geleverd',
    completed: 'Voltooid',
    cancelled: 'Geannuleerd',
    table: 'Tafel',
    orderNumber: 'Bestelling',
    total: 'Totaal',
    time: 'Tijd',
    loadingOrders: 'Bestellingen laden...',
    error: 'Fout',
    tryAgain: 'Opnieuw Proberen',
    live: 'Live',
    offline: 'Offline',
    creating: 'Aanmaken...',
    testOrder: 'Test Bestelling',
    refresh: 'Vernieuwen',
    noActiveOrders: 'Geen actieve bestellingen',
    newOrdersWillAppear: 'Nieuwe bestellingen verschijnen hier wanneer klanten ze plaatsen.',
    items: 'items',
    markAs: 'Markeer als',
    note: 'Notitie',
  },
  
  // Tables
  tables: {
    title: 'Tafels',
    addTable: 'Tafel Toevoegen',
    tableNumber: 'Tafelnummer',
    capacity: 'Capaciteit',
    qrCode: 'QR Code',
    downloadQr: 'Download QR',
    viewFullSize: 'Volledige Grootte',
    available: 'Beschikbaar',
    occupied: 'Bezet',
    reserved: 'Gereserveerd',
    maintenance: 'Onderhoud',
    qrCodeNotAvailable: 'QR code niet beschikbaar',
    qrCodesGenerated: 'QR codes worden automatisch gegenereerd wanneer tafels worden aangemaakt',
    manageTablesDescription: 'Beheer restauranttafels en realtime status',
    live: 'Live',
    offline: 'Offline',
    refresh: 'Vernieuwen',
    total: 'Totaal',
    outOfOrder: 'Buiten Gebruik',
    searchTables: 'Zoek tafels...',
    allStatuses: 'Alle Statussen',
    noTablesFound: 'Geen tafels gevonden',
    createFirstTable: 'Maak uw eerste tafel aan om te beginnen.',
    table: 'Tafel',
    seats: 'plaatsen',
    code: 'Code',
    viewQr: 'Bekijk QR',
    qrCodeFor: 'QR Code - Tafel',
    permanentQrCode: 'Permanente QR Code',
    permanentQrDescription: 'Deze QR code is permanent en veilig voor afdrukken op fysieke materialen. Deze zal nooit veranderen tenzij handmatig opnieuw gegenereerd door een beheerder.',
    customerUrl: 'Klant URL',
    customerUrlDescription: 'Klanten worden doorgestuurd naar deze URL wanneer ze de QR code scannen',
  },
  
  // Menu
  menu: {
    // Page titles and headers
    title: 'Menu',
    menuManagement: 'Menu Beheer',
    loading: 'Menu laden...',
    retry: 'Opnieuw Proberen',
    pleaseSelectRestaurant: 'Selecteer een restaurant om het menu te beheren.',
    
    // Actions
    addMenuItem: 'Menu Item Toevoegen',
    addCategory: 'Categorie Toevoegen',
    edit: 'Bewerken',
    hide: 'Verbergen',
    show: 'Tonen',
    
    // Categories
    category: 'Categorie',
    categories: 'Categorieën',
    filterByCategory: 'Filteren op Categorie',
    allItems: 'Alle Items',
    createNewCategory: 'Nieuwe Categorie Aanmaken',
    
    // Item status
    available: 'Beschikbaar',
    unavailable: 'Niet Beschikbaar',
    hidden: 'Verborgen',
    notVisibleToCustomers: 'Niet zichtbaar voor klanten',
    
    // Visibility toggle
    showHidden: 'Verborgen Tonen',
    hideUnavailable: 'Niet-beschikbare Verbergen',
    
    // Empty states
    noMenuItemsFound: 'Geen menu items gevonden',
    startByAddingFirstItem: 'Begin door uw eerste menu item toe te voegen.',
    
    // Modal titles
    addNewMenuItem: 'Nieuw Menu Item Toevoegen',
    editMenuItem: 'Menu Item Bewerken',
    
    // Error states
    error: 'Fout',
  },
  
  // Restaurant
  restaurant: {
    selectRestaurant: 'Selecteer Restaurant',
    addRestaurant: 'Restaurant Toevoegen',
    restaurantName: 'Restaurantnaam',
    logoUrl: 'Logo URL',
    welcome: 'Welkom',
    chooseRestaurant: 'kies een restaurant om te beheren',
    noRestaurantsFound: 'Geen restaurants gevonden',
    noRestaurantsAvailable: 'Geen restaurants beschikbaar in het systeem',
    createRestaurant: 'Restaurant Aanmaken',
    creating: 'Aanmaken...',
    requiredFields: 'Verplichte velden',
    tryAgain: 'Opnieuw proberen',
  },
  
  // Auth
  auth: {
    login: 'Inloggen',
    logout: 'Uitloggen',
    email: 'E-mail',
    password: 'Wachtwoord',
    forgotPassword: 'Wachtwoord Vergeten',
    rememberMe: 'Onthoud Mij',
    signIn: 'Aanmelden',
  },
  
  // Validation & Errors
  validation: {
    required: 'Verplicht',
    invalidEmail: 'Ongeldig e-mailadres',
    passwordTooShort: 'Wachtwoord te kort',
    phoneInvalid: 'Ongeldig telefoonnummer',
    urlInvalid: 'Ongeldige URL',
    networkError: 'Netwerkfout',
    apiNotRunning: 'zorg ervoor dat de API draait',
  },
  
  // Time & Dates
  time: {
    justNow: 'zojuist',
    minutesAgo: 'minuten geleden',
    hoursAgo: 'uur geleden',
    daysAgo: 'dagen geleden',
    weeksAgo: 'weken geleden',
    monthsAgo: 'maanden geleden',
  },
};

export default nl;