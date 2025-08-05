import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';

// Set timezone to Amsterdam/Europe timezone
process.env.TZ = 'Europe/Amsterdam';

import { validateEnvironment } from './src/utils/env-validation.js';
import prismaPlugin from './src/plugins/prisma.js';
import { WebSocketService } from './src/services/infrastructure/websocket/websocket.service.js';
import { registerErrorHandlers } from './src/middleware/error.middleware.js';
import { logger } from './src/utils/logger.js';
import { initializeSessionCleanupJob } from './src/jobs/session-cleanup.job.js';
import menuRoutes from './src/routes/menu/index.js';
import restaurantRoutes from "./src/routes/restaurants/index.js";
import tableRoutes from "./src/routes/tables/index.js";
import orderRoutes from "./src/routes/orders/index.js";
import categoryRoutes from "./src/routes/menu-categories/index.js";
import modifierGroupRoutes from "./src/routes/modifier-groups/index.js";
import modifierRoutes from "./src/routes/modifiers/index.js";
import authRoutes from "./src/routes/auth/index.js";
import staffRoutes from "./src/routes/staff/index.js";
import staffSessionRoutes from "./src/routes/staff/sessions.js";
import paymentRoutes from "./src/routes/payments/index.js";
import sessionRoutes from "./src/routes/sessions/index.js";

const fastify = Fastify({ 
  logger: process.env.NODE_ENV === 'production' 
    ? { level: 'info' }
    : { 
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
          }
        }
      },
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
  disableRequestLogging: process.env.NODE_ENV === 'production'
});

// Global WebSocket service declaration
declare global {
  var wsService: WebSocketService;
  var sessionCleanupJob: any;
}

const start = async () => {
  try {
    // Validate environment variables first
    validateEnvironment();
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
        ? process.env.FRONTEND_URL?.split(',') || false
        : true, // Allow all origins for development
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Restaurant-Context']
    });
    
    await fastify.register(prismaPlugin);
    
    // Register error handling (CRITICAL - was missing!)
    registerErrorHandlers(fastify);

    // Health check endpoint
    fastify.get('/api/health', async (request, reply) => {
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
    await fastify.register(tableRoutes, { prefix: "/api" });
    await fastify.register(orderRoutes, { prefix: "/api/orders" });
    await fastify.register(categoryRoutes, { prefix: "/api/menu-categories" });
    await fastify.register(modifierGroupRoutes, { prefix: "/api/modifier-groups" });
    await fastify.register(modifierRoutes, { prefix: "/api/modifiers" });
    await fastify.register(authRoutes, { prefix: "/api/auth" });
    await fastify.register(staffRoutes, { prefix: "/api/staff" });
    await fastify.register(staffSessionRoutes, { prefix: "/api/staff" }); // Staff session management
    await fastify.register(paymentRoutes, { prefix: "/api/payments" });
    await fastify.register(sessionRoutes, { prefix: "/api/sessions" });

    // Start server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
    // Initialize WebSocket service on the same server
    const httpServer = fastify.server;
    global.wsService = new WebSocketService(httpServer, fastify.prisma);
    
    console.log(`🔌 WebSocket: ws://localhost:${port}`);
    
    // Initialize session cleanup job
    const sessionCleanupJob = initializeSessionCleanupJob(fastify.prisma);
    sessionCleanupJob.start();
    global.sessionCleanupJob = sessionCleanupJob;
    
    // Professional startup logging
    const services = ['Database', 'Redis', 'WebSocket', 'Mollie'];
    logger.system.startup(port, services);
    
    // Pretty console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log('\n🚀 TableTech API Server Started');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📡 Server: http://localhost:${port}`);
      console.log(`🏥 Health: http://localhost:${port}/api/health`);
      console.log('\n📚 API Endpoints:');
      console.log(`   🔐 Auth:       /api/auth`);
      console.log(`   👥 Staff:      /api/staff`);
      console.log(`   🏪 Restaurants: /api/restaurants`);
      console.log(`   🍽️  Menu:       /api/menu`);
      console.log(`   📂 Categories: /api/menu-categories`);
      console.log(`   🛎️  Orders:     /api/orders`);
      console.log(`   🪑 Tables:     /api/staff/tables, /api/customer/validate-table`);
      console.log(`   💳 Payments:   /api/payments`);
      console.log(`   🔗 Sessions:   /api/sessions`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown with proper logging
process.on('SIGTERM', async () => {
  logger.system.shutdown('SIGTERM received');
  console.log('🛑 Shutting down gracefully...');
  if (global.wsService) {
    await global.wsService.shutdown();
  }
  if (global.sessionCleanupJob) {
    global.sessionCleanupJob.stop();
  }
  await fastify.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.system.shutdown('SIGINT received (Ctrl+C)');
  console.log('🛑 Shutting down gracefully...');
  if (global.wsService) {
    await global.wsService.shutdown();
  }
  if (global.sessionCleanupJob) {
    global.sessionCleanupJob.stop();
  }
  await fastify.close();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  logger.error.log(error, { context: 'uncaughtException' });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error.log(new Error(`Unhandled Rejection: ${reason}`), { context: 'unhandledRejection' });
  process.exit(1);
});

start();