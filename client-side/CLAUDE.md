# CLAUDE.md - Client-Side Customer App

This file provides guidance to Claude Code (claude.ai/code) when working with the TableTech client-side customer ordering application.

## Customer App Overview

The client-side is a **mobile-first QR code ordering system** built with Next.js 15 App Router:
- **QR Code Entry** → Customers scan table QR codes to access menus
- **Session-Based** → No user authentication, table-based sessions
- **Payment Integration** → Mollie payment processing
- **Real-Time Tracking** → Order status updates

## Critical Development Commands

```bash
# Development
npm run dev           # Start development server (port 3000)
npm run build         # Production build
npm run start         # Production server
npm run lint          # ESLint checking
```

## Customer Journey Flow - MUST UNDERSTAND

```
1. /expiredsession         → QR scanner page (entry point)
2. /table/[tableCode]      → Table validation
3. /client/[restaurantId]/[tableId] → Menu browsing
4. /client/[restaurantId]/[tableId]/cart → Cart review
5. Payment redirect        → Mollie checkout
6. /client/thankyou        → Order confirmation
```

## Project Structure Pattern

### App Router Organization
```
app/
├── layout.tsx              # Root layout with Geist font
├── page.tsx                # Redirects to /expiredsession
├── globals.css             # Global styles and animations
├── expiredsession/         # QR scanner entry point
├── table/[tableCode]/      # Table validation
├── client/                 # Customer experience
│   ├── [restaurantId]/[tableId]/
│   │   ├── page.tsx        # Menu browsing
│   │   ├── cart/           # Shopping cart
│   │   └── components/     # Page-specific components
│   ├── payment-cancelled/  # Payment failure
│   └── thankyou/           # Order confirmation
├── error/                  # Error pages
└── shared/                 # Shared utilities
    └── utils/
        ├── date.ts         # Amsterdam timezone utilities
        └── error-reporting.ts # Error tracking
```

## State Management Pattern

### Cart Management via localStorage
```typescript
// Getting cart
const cart = JSON.parse(localStorage.getItem("cart") || "[]");

// Adding to cart
const handleAddToCart = (item: any) => {
  const existing = cart.find((i) => i.id === item.id);
  const newCart = existing
    ? cart.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
    : [...cart, { ...item, quantity: 1 }];
  
  setCart(newCart);
  localStorage.setItem("cart", JSON.stringify(newCart));
};

// Clear cart after order
localStorage.removeItem("cart");
```

### Session Storage
```typescript
// Store table code for session
localStorage.setItem("tableCode", tableCode);

// Retrieve for API calls
const tableCode = localStorage.getItem("tableCode");
```

## API Integration Pattern

### Base URL Configuration
All API calls target: `http://localhost:3001/api/`

### Common API Calls
```typescript
// Validate table QR code
const response = await fetch('/api/customer/validate-table', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: tableCode })
});

// Fetch menu for customer
const response = await fetch(`/api/menu/customer/${tableCode}/${restaurantId}`);

// Create order with payment
const response = await fetch('/api/payments/create-with-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tableCode,
    items: cartItems,
    description: `Order via Tafel ${tableNumber}`,
    notes: undefined
  })
});

// Track order status
const response = await fetch(`/api/orders/customer/orders/id/${orderId}`);
```

### Error Handling
```typescript
try {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('API request failed');
  }
  const data = await response.json();
  // Handle success
} catch (error) {
  console.error('Error:', error);
  // Show user-friendly error message
}
```

## QR Code Scanning

### Using ZXing Library
```typescript
import { BrowserMultiFormatReader } from '@zxing/library';

const codeReader = useRef(new BrowserMultiFormatReader());

// Start scanning
const startScanning = async () => {
  const controls = await codeReader.current.decodeFromVideoDevice(
    undefined,
    videoRef.current,
    (result, error) => {
      if (result) {
        const tableCode = extractTableCode(result.getText());
        router.push(`/table/${tableCode}`);
      }
    }
  );
  setVideoControls(controls);
};

// Extract table code from QR
const extractTableCode = (text: string) => {
  const match = text.match(/table\/([A-Z0-9]+)/i);
  return match ? match[1] : text;
};
```

## Payment Integration (Mollie)

### Payment Flow
```typescript
// 1. Prepare payment payload
const paymentPayload = {
  tableCode: tableCode,
  items: cartItems.map((item) => ({
    menuId: String(item.id),
    quantity: parseInt(item.quantity),
    modifiers: item.modifiers?.map((m: string) => String(m)) || [],
    notes: item.notes || undefined
  })),
  description: `Order via Tafel ${tableNumber}`,
  notes: undefined
};

// 2. Create payment
const response = await fetch('/api/payments/create-with-order', {
  method: 'POST',
  body: JSON.stringify(paymentPayload)
});

// 3. Redirect to Mollie
if (data.checkoutUrl) {
  window.location.href = data.checkoutUrl;
}
```

### Payment Return Handling
- **Success**: `/client/thankyou?orderId=xxx`
- **Cancelled**: `/client/payment-cancelled`

## Mobile-First Design Patterns

### Responsive Containers
```typescript
// Standard mobile container
<div className="max-w-sm mx-auto p-4">
  {/* Content */}
</div>

// Touch-friendly buttons
<button className="w-full py-4 px-6 text-lg">
  {/* Minimum 44px touch target */}
</button>
```

### Animations with Framer Motion
```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ y: "-100%", opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  exit={{ x: "-100%" }}
  transition={{ duration: 0.6, ease: "easeOut" }}
>
  {/* Animated content */}
</motion.div>
```

### Custom CSS Animations
```css
/* In globals.css */
@keyframes slide-up {
  0% { opacity: 0; transform: translateY(30px); }
  100% { opacity: 1; transform: translateY(0); }
}

.animate-slide-up {
  animation: slide-up 0.8s ease-out;
}
```

## Component Patterns

### Client Components
```typescript
"use client"; // Required for interactivity

import { useState, useEffect } from 'react';
```

### Loading States
```typescript
if (loading) {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900"></div>
    </div>
  );
}
```

### Error States
```typescript
if (error) {
  return (
    <div className="max-w-sm mx-auto p-6 text-center">
      <p className="text-red-600">{error}</p>
      <button onClick={retry} className="mt-4 text-blue-600">
        Probeer opnieuw
      </button>
    </div>
  );
}
```

## Internationalization

### Dutch Language Support
```typescript
// All text in Dutch
const messages = {
  scanQR: "Scan de QR-code op uw tafel",
  addToCart: "Toevoegen aan winkelwagen",
  checkout: "Afrekenen",
  orderConfirmed: "Bestelling bevestigd"
};

// Euro currency formatting
const formatPrice = (price: number) => {
  return `€${price.toFixed(2).replace('.', ',')}`;
};

// Amsterdam timezone
const formatTime = (date: Date) => {
  return date.toLocaleTimeString('nl-NL', {
    timeZone: 'Europe/Amsterdam',
    hour: '2-digit',
    minute: '2-digit'
  });
};
```

## URL Parameter Handling

### Dynamic Routes
```typescript
import { useParams } from 'next/navigation';

// Type-safe params
const { restaurantId, tableId } = useParams() as {
  restaurantId: string;
  tableId: string;
};
```

### Query Parameters
```typescript
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const orderId = searchParams.get('orderId');
```

## Error Reporting Service

### Centralized Error Tracking
```typescript
import { errorReportingService } from '@/shared/utils/error-reporting';

// Report errors
errorReportingService.reportError(error, {
  context: 'payment_processing',
  userId: tableCode
});

// Get error logs
const logs = errorReportingService.getStoredErrors();
```

## Performance Considerations

### Image Optimization
```typescript
import Image from 'next/image';

<Image
  src={item.imageUrl}
  alt={item.name}
  width={300}
  height={200}
  className="rounded-lg"
  loading="lazy"
/>
```

### Category Navigation
```typescript
// Smooth scroll to category
const scrollToCategory = (categoryId: string) => {
  const element = document.getElementById(`category-${categoryId}`);
  element?.scrollIntoView({ behavior: 'smooth' });
};
```

## Common Patterns to Follow

### Session Validation
```typescript
// Always check table code exists
const tableCode = localStorage.getItem("tableCode");
if (!tableCode) {
  router.push("/expiredsession");
  return;
}
```

### Cart Item Structure
```typescript
interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}
```

### API Response Validation
```typescript
// Always validate API responses
if (!response.ok) {
  throw new Error(`HTTP error! status: ${response.status}`);
}
const data = await response.json();
if (!data || !data.success) {
  throw new Error(data.message || 'Unknown error');
}
```

## Common Pitfalls to Avoid

1. **Don't forget localStorage checks** - Always handle empty/invalid cart states
2. **Handle QR scan failures** - Camera permissions may be denied
3. **Validate table codes** - Invalid QR codes should show clear errors
4. **Clear cart after order** - Remove localStorage items after successful payment
5. **Handle payment redirects** - Both success and cancellation flows
6. **Mobile-first styling** - Test on actual mobile devices
7. **Network error handling** - Show offline states appropriately
8. **Dutch language consistency** - All user-facing text in Dutch

## Testing Approach

Currently no tests configured. When adding tests:
1. Test QR code scanning flow
2. Test cart operations (add, remove, update)
3. Test payment integration flow
4. Mock localStorage for unit tests
5. Test error states and network failures
6. Test mobile responsiveness