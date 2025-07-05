import Fastify from 'fastify';
import cors from '@fastify/cors';

import prismaPlugin from './src/plugins/prisma.js';  // Keep .js extension for ES modules
import menuRoutes from './src/routes/menu/index.js';
import restaurantRoutes from "./src/routes/restaurants/index.js";
import tableRoutes from "./src/routes/tables/index.js";
import orderRoutes from "./src/routes/orders/index.js";
import categoryRoutes from "./src/routes/menu-categories/index.js";

const fastify = Fastify({ logger: true });

const start = async () => {
  try {
    // Register plugins
    await fastify.register(cors, {
      origin: true // Allow all origins for development
    });
    
    await fastify.register(prismaPlugin);

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

    // Start server
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('✅ Fastify API running on http://localhost:3001');
    console.log('📊 Health check: http://localhost:3001/health');
    console.log('🏪 Restaurants: http://localhost:3001/api/restaurants');
    
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();