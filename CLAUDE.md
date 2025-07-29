# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Engineering Principles

As an AI assistant working on this codebase, you should:

1. **Challenge assumptions**: Never assume the user's request is the best approach. Always evaluate if there are better solutions, more efficient patterns, or potential issues with the proposed approach.

2. **Suggest alternatives**: When a user requests something, consider:
   - Is this the most maintainable solution?
   - Are there existing patterns in the codebase that should be followed instead?
   - Could this introduce security vulnerabilities or performance issues?
   - Is there a more type-safe or robust approach?

3. **Follow established patterns**: Before implementing something new, examine the existing codebase architecture and follow established patterns rather than introducing inconsistencies.

4. **Prioritize code quality**: Always write code that is:
   - Type-safe and well-typed
   - Properly error-handled
   - Following the existing code style and conventions
   - Documented when necessary
   - Tested (or testable)

5. **Security-first mindset**: Always consider security implications, especially around:
   - Authentication and authorization
   - Input validation and sanitization
   - SQL injection prevention (use Prisma's type-safe queries)
   - XSS prevention
   - Proper error handling that doesn't leak sensitive information

6. **Performance considerations**: Be mindful of:
   - Database query efficiency
   - N+1 query problems
   - Proper use of Prisma includes/selects
   - Frontend bundle size and rendering performance

## Project Structure

TableTech is a monorepo for a restaurant management system with three main applications:
- **API** (`api/`): Fastify-based REST API with PostgreSQL and Prisma
- **Client Side** (`client-side/`): Next.js customer-facing app (port 3000)
- **Kitchen Side** (`kitchen-side/`): Next.js restaurant management dashboard (port 3002)

## Development Commands

### Starting Development Servers
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
npm run dev           # Start API with tsx hot reload
npx prisma generate   # Generate Prisma client after schema changes
npx prisma db push    # Push schema changes to database
npx prisma studio     # Open Prisma database browser
```

### Frontend Development
```bash
# Client-side app
cd client-side
npm run dev
npm run build
npm run lint

# Kitchen-side app  
cd kitchen-side
npm run dev
npm run build
npm run lint
```

## API Architecture

The API follows a layered architecture pattern:

### Core Structure
- **Routes** (`src/routes/`): Fastify route handlers with validation
- **Controllers** (`src/controllers/`): Business logic orchestration
- **Services** (`src/services/`): Data access layer extending BaseService
- **Schemas** (`src/schemas/`): Zod validation schemas
- **Middleware** (`src/middleware/`): Authentication, validation, error handling
- **Utils** (`src/utils/`): Shared utilities (JWT, password hashing, etc.)

### Key Patterns
- All services extend `BaseService<TInput, TOutput>` for consistent CRUD operations
- Zod schemas are used for request/response validation
- JWT-based authentication with role-based access control
- Comprehensive error handling with custom error types
- Structured logging with request ID tracking

### Database Schema
Built with Prisma ORM using PostgreSQL. Key entities:
- `Restaurant` - Multi-tenant restaurant data
- `Table` - QR code enabled table management
- `MenuItem` & `MenuCategory` - Menu structure
- `ModifierGroup` & `Modifier` - Menu item customizations
- `Order` & `OrderItem` - Order management with status tracking
- `Staff` - User management with role-based permissions
- `Payment` - Mollie payment integration

### API Endpoints
All endpoints are prefixed with `/api/`:
- `/auth` - Authentication and authorization
- `/staff` - Staff management
- `/restaurants` - Restaurant CRUD operations
- `/menu` - Menu item management
- `/menu-categories` - Menu category management
- `/orders` - Order processing and tracking
- `/tables` - Table management and QR codes
- `/modifier-groups` & `/modifiers` - Menu customization options

## Technology Stack

### Backend
- **Fastify**: Web framework with TypeScript support
- **Prisma**: Database ORM with PostgreSQL
- **Zod**: Schema validation
- **JWT**: Authentication tokens
- **bcryptjs**: Password hashing

### Frontend (Both Apps)
- **Next.js 15**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **React 19**: UI library

### Development Tools
- **tsx**: TypeScript execution for API
- **concurrently**: Run multiple dev servers
- **ESLint**: Code linting for Next.js apps

## Environment Setup

The API requires a `DATABASE_URL` environment variable for PostgreSQL connection. Both frontend apps use `.env.local` files for configuration.

## Testing and Quality

Run linting on frontend applications:
```bash
cd client-side && npm run lint
cd kitchen-side && npm run lint
```

No test framework is currently configured. When adding tests, check for existing test scripts in package.json files first.