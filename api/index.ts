import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

import prismaPlugin from './src/plugins/prisma.js';
import { WebSocketService } from './src/services/infrastructure/websocket/websocket.service.js';
import { registerErrorHandlers } from './src/middleware/error.middleware.js';
import menuRoutes from './src/routes/menu/index.js';
import restaurantRoutes from "./src/routes/restaurants/index.js";
import tableRoutes from "./src/routes/tables/index.js";
import orderRoutes from "./src/routes/orders/index.js";
import categoryRoutes from "./src/routes/menu-categories/index.js";
import modifierGroupRoutes from "./src/routes/modifier-groups/index.js";
import modifierRoutes from "./src/routes/modifiers/index.js";
import authRoutes from "./src/routes/auth/index.js";
import staffRoutes from "./src/routes/staff/index.js";
import paymentRoutes from "./src/routes/payments/index.js";

const fastify = Fastify({ 
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId'
});

// Global WebSocket service declaration
declare global {
  var wsService: WebSocketService;
}

const start = async () => {
  try {
    // Register security headers first
    await fastify.register(helmet, {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // Needed for some integrations
    });

    // Register CORS after helmet
    await fastify.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://your-frontend-domain.com', 'https://your-kitchen-domain.com']
        : true, // Allow all origins for development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    });
    
    await fastify.register(prismaPlugin);
    
    // Register error handling (CRITICAL - was missing!)
    registerErrorHandlers(fastify);

    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;
        return { 
          status: 'OK', 
          database: 'connected',
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        return reply.status(500).send({ 
          status: 'ERROR', 
          database: 'disconnected',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });

    // Register API routes with correct prefixes
    await fastify.register(menuRoutes, { prefix: "/api/menu" });
    await fastify.register(restaurantRoutes, { prefix: "/api/restaurants" });
    await fastify.register(tableRoutes, { prefix: "/api/tables" });
    await fastify.register(orderRoutes, { prefix: "/api/orders" });
    await fastify.register(categoryRoutes, { prefix: "/api/menu-categories" });
    await fastify.register(modifierGroupRoutes, { prefix: "/api/modifier-groups" });
    await fastify.register(modifierRoutes, { prefix: "/api/modifiers" });
    await fastify.register(authRoutes, { prefix: "/api/auth" });
    await fastify.register(staffRoutes, { prefix: "/api/staff" });
    await fastify.register(paymentRoutes, { prefix: "/api/payments" });

    // Start server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    // Initialize WebSocket service on the same server
    const httpServer = fastify.server;
    global.wsService = new WebSocketService(httpServer, fastify.prisma);
    
    console.log(`🔌 WebSocket: ws://localhost:${port}`);
    
    // Improved startup logs
    console.log('\n🚀 TableTech API Server Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📡 Server: http://localhost:${port}`);
    console.log(`🏥 Health: http://localhost:${port}/health`);
    console.log('\n📚 API Endpoints:');
    console.log(`   🔐 Auth:       /api/auth`);
    console.log(`   👥 Staff:      /api/staff`);
    console.log(`   🏪 Restaurants: /api/restaurants`);
    console.log(`   🍽️  Menu:       /api/menu`);
    console.log(`   📂 Categories: /api/menu-categories`);
    console.log(`   🛎️  Orders:     /api/orders`);
    console.log(`   🪑 Tables:     /api/tables`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down gracefully...');
  if (global.wsService) {
    await global.wsService.shutdown();
  }
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 Shutting down gracefully...');
  if (global.wsService) {
    await global.wsService.shutdown();
  }
  await fastify.close();
  process.exit(0);
});

start();