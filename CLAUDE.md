# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TableTech is a monorepo restaurant management system with three main applications:
- **API** (`api/`): Fastify REST API with PostgreSQL/Prisma, WebSocket support, and Mollie payments (port 3001)
- **Client-Side** (`client-side/`): Next.js 15 customer-facing QR code ordering app (port 3000)
- **Kitchen-Side** (`kitchen-side/`): Next.js 15 restaurant staff dashboard (port 3002)

## Essential Development Commands

### Quick Start
```bash
# Start all services concurrently
npm run dev

# Start individual services
npm run dev:client    # Client app on port 3000
npm run dev:kitchen   # Kitchen app on port 3002
npm run dev:api       # API server on port 3001
```

### API Development
```bash
cd api
npm run dev           # Start with tsx hot reload
npm run build         # TypeScript compilation
npm run typecheck     # Type check without emit
npm run lint          # ESLint (currently not configured)

# Database management
npm run db:generate   # Generate Prisma client after schema changes
npm run db:migrate    # Deploy database migrations
npm run db:studio     # Open Prisma Studio GUI
```

### Frontend Development
```bash
# Both client-side and kitchen-side share these commands
cd [client-side|kitchen-side]
npm run dev           # Development server
npm run build         # Production build
npm run lint          # ESLint checking

# Kitchen-side additional
cd kitchen-side
npm run lint:fix      # Auto-fix ESLint issues
npm run type-check    # TypeScript checking
```

## Architecture Patterns

### API Architecture (Layered Pattern)
```
src/
├── routes/       # Fastify route handlers with Zod validation
├── controllers/  # Business logic orchestration
├── services/     # Data access layer (all extend BaseService<TInput, TOutput>)
├── schemas/      # Zod validation schemas
├── middleware/   # Auth, validation, error handling
└── utils/        # JWT, password hashing, logging utilities
```

**Key Patterns:**
- All services extend `BaseService` for consistent CRUD operations
- Zod schemas validate all requests/responses
- JWT authentication with role-based access (SUPER_ADMIN, ADMIN, MANAGER, CHEF, WAITER, CASHIER)
- Multi-tenant architecture with restaurant-scoped data
- WebSocket support via Socket.io for real-time updates

### Frontend Architecture
**Kitchen-Side:** Feature-based organization with domain folders containing components, hooks, services, and types
**Client-Side:** Route-based organization with App Router dynamic routes for table/QR access

Both use:
- Next.js 15 with App Router
- TypeScript strict mode
- Tailwind CSS for styling
- Environment variables in `.env.local`

## Database Schema (Prisma)

Key entities and relationships:
- `Restaurant` → Multi-tenant root entity
- `Table` → QR-enabled table management
- `MenuItem`, `MenuCategory` → Menu structure
- `ModifierGroup`, `Modifier` → Customization options
- `Order`, `OrderItem` → Order tracking with status workflow
- `Staff` → User management with roles
- `CustomerSession`, `StaffSession` → Session tracking
- `Payment` → Mollie integration
- `AuditLog` → Compliance tracking

## API Endpoints

All prefixed with `/api/`:
- `/auth` - Authentication (login, logout, refresh)
- `/staff` - Staff CRUD with role management
- `/restaurants` - Restaurant management
- `/menu`, `/menu-categories` - Menu management
- `/orders` - Order processing with real-time updates
- `/tables` - Table management and QR generation
- `/modifier-groups`, `/modifiers` - Menu customizations
- `/payments` - Payment processing
- `/sessions` - Session management

## Critical Conventions

### When Making Changes:
1. **Follow existing patterns** - Check neighboring files for established conventions
2. **Maintain type safety** - Use Prisma-generated types and Zod schemas
3. **Handle errors properly** - Use structured error responses
4. **Consider multi-tenancy** - Always scope data by restaurant
5. **Check for existing utilities** - Reuse BaseService, auth middleware, validation schemas

### Security Considerations:
- Never expose sensitive data in error messages
- Use Prisma's type-safe queries (avoid raw SQL)
- Validate all inputs with Zod schemas
- Check role-based permissions in protected routes
- Session security includes device tracking and concurrent limits

### Performance Guidelines:
- Prevent N+1 queries with proper Prisma includes/selects
- Use database indexes (defined in schema)
- Leverage Redis caching where implemented
- Consider WebSocket for real-time features

## Environment Setup

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- Frontend apps use `.env.local` for configuration
- Timezone is set to Europe/Amsterdam (Dutch market)

## Testing Status

Currently no test framework is configured. Use TypeScript compilation and ESLint for static analysis:
```bash
cd api && npm run typecheck
cd client-side && npm run lint
cd kitchen-side && npm run lint
```