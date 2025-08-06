# CLAUDE.md - TableTech API

This file provides guidance to Claude Code (claude.ai/code) when working with the TableTech API codebase.

## API Architecture Overview

The API follows a **layered architecture** pattern with clear separation of concerns:
- **Routes** → Define endpoints and middleware chains
- **Controllers** → Orchestrate business operations
- **Services** → Implement business logic and data access (all extend `BaseService`)
- **Database** → Prisma ORM with PostgreSQL

## Critical Development Commands

```bash
# Development
npm run dev           # Start with tsx hot reload (port 3001)
npm run build         # TypeScript compilation
npm run typecheck     # Type check without emit

# Database Management - ALWAYS run these after schema changes
npm run db:generate   # Generate Prisma client (run after schema changes)
npm run db:migrate    # Deploy migrations to database
npm run db:studio     # Open Prisma Studio GUI

# Production
npm run start:prod    # Production server with NODE_ENV=production
```

## Service Layer Pattern - MUST FOLLOW

All services extend `BaseService<CreateInput, Model>`:

```typescript
export class YourService extends BaseService<CreateYourDTO, Your> {
  protected model = 'your' as const;  // Prisma model name
  
  // BaseService provides: findById, findMany, count, etc.
  // Add service-specific methods here
}

// Always use singleton pattern for services
private static instance: YourService;
public static getInstance(): YourService {
  if (!YourService.instance) {
    YourService.instance = new YourService();
  }
  return YourService.instance;
}
```

## Authentication & Authorization Flow

### Multi-Layer Authentication
1. **JWT Token Verification** → Extract and verify token
2. **Session Validation** → Check if session is still valid (not expired/revoked)
3. **Role Verification** → Check user has required role
4. **Restaurant Context** → Ensure multi-tenant isolation

### Using Auth Middleware
```typescript
// In routes
server.post("/your-endpoint", {
  preHandler: [
    requireUser,              // Basic auth
    requireManager,           // Role check (or requireAdmin, requireSuperAdmin)
    requireRestaurantAccess,  // Multi-tenant check
  ]
}, controller.yourMethod);

// Access user in controller
const user = (req as AuthenticatedRequest).user;
const restaurantId = getRestaurantId(req);  // Handles SUPER_ADMIN context
```

### Role Hierarchy
`SUPER_ADMIN` > `ADMIN` > `MANAGER` > `CHEF`/`WAITER`/`CASHIER`

## Error Handling Patterns

### Always Use Structured Errors
```typescript
// Use ApiError for expected errors
throw new ApiError(400, 'INVALID_INPUT', 'Descriptive message');

// Error codes should be SCREAMING_SNAKE_CASE
// Common codes: UNAUTHORIZED, NOT_FOUND, VALIDATION_ERROR, INSUFFICIENT_PERMISSIONS
```

### Business Logic Errors
```typescript
// For domain-specific errors
throw new BusinessLogicError('ORDER_ALREADY_COMPLETED', 'Cannot modify completed order');
```

## Database Query Patterns

### Prevent N+1 Queries
```typescript
// BAD - N+1 query
const orders = await prisma.order.findMany();
for (const order of orders) {
  const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
}

// GOOD - Single query with includes
const orders = await prisma.order.findMany({
  include: { orderItems: true }
});
```

### Use Transactions for Complex Operations
```typescript
const result = await prisma.$transaction(async (tx) => {
  // All operations use tx, not prisma
  const order = await tx.order.create({...});
  await tx.orderItem.createMany({...});
  await tx.payment.create({...});
  return order;
});
```

### Standard Include Patterns
Define reusable includes in services:
```typescript
private getOrderIncludes() {
  return {
    orderItems: {
      include: {
        menuItem: true,
        modifiers: { include: { modifier: true } }
      }
    },
    table: true,
    restaurant: true
  };
}
```

## WebSocket Implementation

### Room Organization
```typescript
// Restaurant-wide updates
`restaurant:${restaurantId}`

// Role-specific rooms
`restaurant:${restaurantId}:role:${role}`

// Kitchen display
`restaurant:${restaurantId}:kitchen`

// Table-specific (customers)
`table:${tableId}`
```

### Emitting Events
```typescript
// Emit to specific rooms
this.io.to(`restaurant:${restaurantId}:kitchen`).emit('order:new', orderData);

// Multiple rooms
this.io.to(room1).to(room2).emit('event', data);
```

## Validation with Zod

### Input Validation Pattern
```typescript
// Define schema
export const CreateOrderSchema = z.object({
  tableId: z.string().uuid(),
  items: z.array(OrderItemSchema).min(1).max(50),
  notes: z.string().max(500).optional()
});

// Use in route
preHandler: [validationMiddleware(CreateOrderSchema)]

// Access validated data in controller
const validatedData = req.body as z.infer<typeof CreateOrderSchema>;
```

### Sanitization
Always sanitize user input:
```typescript
const sanitizeText = (val: string) => val
  .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  .replace(/[<>]/g, '');

// In schema
notes: z.string().transform(sanitizeText)
```

## Multi-Tenant Context Management

### Getting Restaurant ID
```typescript
// Always use this helper
const restaurantId = getRestaurantId(req);

// For SUPER_ADMIN, checks (in order):
// 1. X-Restaurant-Context header
// 2. Route params (restaurantId)
// 3. Query params (restaurantId)
```

### Restaurant Isolation
Always filter by restaurantId in queries:
```typescript
// WRONG
await prisma.order.findMany({ where: { status: 'PENDING' } });

// CORRECT
await prisma.order.findMany({ 
  where: { status: 'PENDING', restaurantId } 
});
```

## Financial Calculations

### Tax-Inclusive Pricing
```typescript
// Database stores prices EXCLUDING tax
// Display prices INCLUDING tax

// Convert for display
const taxMultiplier = 1 + (taxRate / 100);
const priceIncTax = Math.round(price * taxMultiplier * 100) / 100;

// Store in database (reverse calculation)
const priceExclTax = Math.round((priceIncTax / taxMultiplier) * 100) / 100;
```

## Session Management

### Staff Sessions
- JWT contains sessionId for validation
- Sessions tracked in database with device info
- Automatic expiry after inactivity
- Concurrent session limits enforced

### Customer Sessions
- Table-based authentication via QR code
- No JWT, uses sessionId in headers
- Expires when order completed or timeout

## Payment Integration (Mollie)

### Creating Payments
```typescript
// Always include idempotency key
const payment = await paymentService.createPayment({
  orderId,
  amount,
  idempotencyKey: generateIdempotencyKey(orderId, amount)
});
```

### Webhook Handling
- Verify webhook signatures
- Handle duplicate webhook calls
- Update order status on payment completion

## Production Considerations

### Logging Categories
```typescript
logger.perf.slow('operation', duration);        // Performance
logger.security.suspiciousActivity(req, reason); // Security
logger.business.orderCreated(orderId, amount);   // Business metrics
logger.payment.webhookReceived(paymentId);       // Payments
```

### Rate Limiting
Apply to public endpoints:
```typescript
preHandler: [rateLimit(20, 60000)]  // 20 requests per minute
```

### Health Checks
- `/api/health` - Basic health check
- `/api/health/detailed` - Includes database and Redis status

## Common Pitfalls to Avoid

1. **Never use `prisma` directly in routes/controllers** - Always use services
2. **Don't forget restaurant context** - Multi-tenancy must be enforced
3. **Avoid raw SQL** - Use Prisma's type-safe queries
4. **Don't expose internal errors** - Use structured error responses
5. **Remember tax calculations** - Database stores excl. tax, display incl. tax
6. **Check session validity** - Don't rely on JWT alone
7. **Use transactions** - For operations that must be atomic
8. **Validate all inputs** - Use Zod schemas consistently

## Testing Approach

Currently no tests configured. When adding tests:
1. Test services with mocked Prisma client
2. Test routes with Fastify inject
3. Test WebSocket events with socket.io-client
4. Use transactions for test isolation