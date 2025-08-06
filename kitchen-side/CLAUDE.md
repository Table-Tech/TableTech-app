# CLAUDE.md - Kitchen-Side Dashboard

This file provides guidance to Claude Code (claude.ai/code) when working with the TableTech kitchen-side dashboard codebase.

## Dashboard Architecture Overview

The kitchen-side follows a **feature-based architecture** with Next.js 15 App Router:
- **Features** → Self-contained modules with components, hooks, services, and types
- **Shared** → Reusable components, contexts, hooks, and utilities
- **App Router** → File-system based routing with nested layouts

## Critical Development Commands

```bash
# Development
npm run dev           # Start development server (port 3002)
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint checking
npm run lint:fix      # Auto-fix ESLint issues
npm run type-check    # TypeScript checking
npm run analyze       # Bundle size analysis
```

## Project Structure Pattern - MUST FOLLOW

### Feature-Based Organization
Each feature module contains:
```
features/[feature-name]/
├── components/       # Feature-specific components
├── hooks/           # Feature-specific hooks
├── services/        # API integration (optional)
├── types.ts         # Feature types
└── index.ts         # Public exports
```

### Shared Resources
```
shared/
├── components/      # Reusable UI components
├── contexts/        # React contexts (Auth, Language)
├── hooks/           # Common hooks
├── services/        # API and WebSocket clients
├── translations/    # i18n files (en.ts, nl.ts)
├── types/          # Global TypeScript types
└── utils/          # Utility functions
```

## Authentication & Authorization

### Role Hierarchy
`SUPER_ADMIN` > `ADMIN` > `MANAGER` > `CHEF`/`WAITER`/`CASHIER`

### Using Authentication
```typescript
// In components
const { user, selectedRestaurant, hasRole } = useAuth();

// Check roles
if (hasRole(['ADMIN', 'MANAGER'])) {
  // Show admin features
}

// Check restaurant access (multi-tenant)
if (canAccessRestaurant(restaurantId)) {
  // Allow access
}
```

### Protected Routes
All `/dashboard/*` routes are protected. AuthGuard handles:
1. Authentication check → Redirect to `/login` if not authenticated
2. Restaurant selection → Redirect to `/select` for SUPER_ADMIN without selection
3. Role-based access → Filter navigation items by user role

## API Integration Pattern

### Using the API Client
```typescript
// Always use the singleton instance
import { apiClient } from '@/shared/services/api-client';

// API calls with automatic token management
const orders = await apiClient.get<Order[]>('/orders');
const result = await apiClient.post<Order>('/orders', orderData);

// Restaurant context for SUPER_ADMIN
// Automatically added via X-Restaurant-Context header
```

### Error Handling
```typescript
try {
  const data = await apiClient.get('/endpoint');
} catch (error) {
  // API client handles 401 (logout) automatically
  // Handle other errors here
  console.error('API Error:', error);
}
```

## WebSocket Integration

### Using WebSocket Hook
```typescript
// In components needing real-time updates
const { connectionStatus, subscribe, updateOrderStatus } = useWebSocket(restaurantId);

// Subscribe to events
useEffect(() => {
  const unsubscribe = subscribe('order:new', (order) => {
    // Handle new order
  });
  
  return unsubscribe;
}, [subscribe]);

// Emit events
updateOrderStatus(orderId, 'IN_PREPARATION');
```

### WebSocket Events
- `order:new` → New order received
- `order:status` → Order status updated
- `order:cancelled` → Order cancelled
- `table:status` → Table status changed
- `staff:message` → Internal communication

## Component Patterns

### Error Boundaries - ALWAYS USE
```typescript
// Wrap components with appropriate error boundary level
<ErrorBoundary level="page" name="OrdersPage">
  <OrdersContent />
</ErrorBoundary>

// Levels: 'page' | 'section' | 'component'
```

### Form Handling Pattern
```typescript
// Standard form with validation
const [formData, setFormData] = useState<FormData>(initialData);
const [errors, setErrors] = useState<FormErrors>({});
const [isSubmitting, setIsSubmitting] = useState(false);

const validateForm = (): boolean => {
  const newErrors: FormErrors = {};
  
  // Validation logic
  if (!formData.field) {
    newErrors.field = t.errors.fieldRequired;
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  try {
    await apiClient.post('/endpoint', formData);
  } catch (error) {
    setErrors({ submit: t.errors.submitFailed });
  } finally {
    setIsSubmitting(false);
  }
};
```

### Loading States
```typescript
// Use consistent loading patterns
if (isLoading) {
  return <LoadingSpinner size="lg" />;
}

if (!data || data.length === 0) {
  return <EmptyState message={t.noDataMessage} />;
}

// Render data
```

## Internationalization (i18n)

### Using Translations
```typescript
// In components
const t = useTranslation();

// Access translations
<h1>{t.dashboard.title}</h1>
<button>{t.common.save}</button>

// With parameters
t.errors.itemNotFound.replace('{item}', itemName)
```

### Translation Structure
```typescript
// Organized by feature area
{
  common: { save, cancel, delete, ... },
  nav: { dashboard, orders, menu, ... },
  dashboard: { title, welcomeBack, ... },
  orders: { /* feature translations */ },
  // ... other features
}
```

### Adding New Translations
1. Add to both `en.ts` and `nl.ts` files
2. Follow existing structure/nesting
3. Use descriptive keys (not abbreviated)

## State Management

### Context Usage
```typescript
// Auth Context - Authentication and roles
const { user, selectedRestaurant, logout } = useAuth();

// Language Context - Internationalization
const { language, setLanguage, t } = useLanguage();
```

### Local State Pattern
```typescript
// Feature-specific state in custom hooks
export function useOrders(restaurantId: string) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch logic, WebSocket subscriptions, etc.
  return { orders, isLoading, error, refetch };
}
```

## TypeScript Patterns

### Type Imports
```typescript
// Import from centralized types
import type { Order, OrderStatus, OrderItem } from '@/shared/types';

// Feature-specific types
import type { OrderFilters } from '../types';
```

### API Response Typing
```typescript
// Always type API responses
const orders = await apiClient.get<Order[]>('/orders');
const result = await apiClient.post<CreateOrderResponse>('/orders', data);
```

## UI Components Usage

### Button Variants
```typescript
<Button variant="primary" size="lg" isLoading={isSubmitting}>
  {t.common.save}
</Button>

// Variants: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost' | 'outline'
// Sizes: 'sm' | 'md' | 'lg'
```

### Modal Pattern
```typescript
<Modal isOpen={isOpen} onClose={handleClose} title={t.modal.title}>
  <Modal.Body>
    {/* Content */}
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={handleClose}>{t.common.cancel}</Button>
    <Button variant="primary" onClick={handleSave}>{t.common.save}</Button>
  </Modal.Footer>
</Modal>
```

## Navigation Structure

### Route Organization
```
/login                    # Public - Authentication
/select                   # SUPER_ADMIN - Restaurant selection
/dashboard/               # Protected - Main dashboard
├── /orders              # Order management (all roles)
├── /menu                # Menu management (ADMIN, MANAGER, CHEF)
├── /tables              # Table management (ADMIN, MANAGER)
├── /statistics          # Analytics (ADMIN, MANAGER)
└── /beheer              # Settings (ADMIN only)
```

### Dynamic Navigation
Navigation items are filtered based on user role - defined in `DashboardLayout.tsx`

## Performance Considerations

### Real-Time Updates
- WebSocket connections are managed per restaurant
- Automatic reconnection with exponential backoff
- Fallback to polling if WebSocket unavailable

### Bundle Optimization
- Dynamic imports for heavy components
- Image optimization with Next.js Image
- CSS purging with Tailwind

## Common Patterns to Follow

### Multi-Tenant Support
```typescript
// SUPER_ADMIN can switch restaurants
if (user.role === 'SUPER_ADMIN') {
  // Show restaurant selector
  // Use selectedRestaurant.id for API calls
} else {
  // Use user.restaurantId
}
```

### Error Collection
Errors are automatically collected in localStorage for debugging:
```typescript
// Access error logs
const errorLogs = JSON.parse(localStorage.getItem('kitchenErrorLogs') || '[]');
```

### Timezone Handling
All timestamps use Amsterdam timezone:
```typescript
new Date().toLocaleString('en-US', { timeZone: 'Europe/Amsterdam' })
```

## Common Pitfalls to Avoid

1. **Don't forget error boundaries** - Wrap all pages and major sections
2. **Check role permissions** - Not all users can access all features
3. **Handle WebSocket disconnections** - Show connection status to users
4. **Validate forms client-side** - Don't rely only on API validation
5. **Use translation keys** - Never hardcode text strings
6. **Type API responses** - Always provide types for apiClient calls
7. **Check restaurant context** - SUPER_ADMIN operations need restaurant selection
8. **Handle loading states** - Show spinners/skeletons during data fetching

## Testing Approach

Currently no tests configured. When adding tests:
1. Test components with React Testing Library
2. Mock API client and WebSocket
3. Test role-based rendering
4. Test form validation logic
5. Test error boundary behavior