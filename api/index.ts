import Fastify from 'fastify';
import cors from '@fastify/cors';

import prismaPlugin from './src/plugins/prisma.js';
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

const fastify = Fastify({ 
  logger: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId'
});

const start = async () => {
  try {
    // Register core plugins first
    await fastify.register(cors, {
      origin: true, // Allow all origins for development
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

    // Start server
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    
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

start();