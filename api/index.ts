import Fastify from 'fastify';
import cors from '@fastify/cors';

import prismaPlugin from './src/plugins/prisma.js';
import menuRoutes from './src/routes/menu/index.js';
import restaurantRoutes from "./src/routes/restaurants/index.js";
import tableRoutes from "./src/routes/tables/index.js";
import orderRoutes from "./src/routes/orders/index.js";


const fastify = Fastify({ logger: true });

// Register plugins
await fastify.register(cors);             // if you're calling from a browser
await fastify.register(prismaPlugin);     // register Prisma

await fastify.register(menuRoutes, { prefix: "/menu" }); //routes
await fastify.register(restaurantRoutes, { prefix: "/restaurant" });
await fastify.register(tableRoutes, { prefix: "/table" });
await fastify.register(orderRoutes, { prefix: "/order" });



// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('✅ Fastify API running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
