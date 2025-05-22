import Fastify from 'fastify';
import cors from '@fastify/cors';

import prismaPlugin from './src/plugins/prisma.js';        // 👈 Prisma plugin
import menuRoutes from './src/routes/menu/index.js';       // ✅ Menu route

const fastify = Fastify({ logger: true });

// Register plugins
await fastify.register(cors);             // if you're calling from a browser
await fastify.register(prismaPlugin);     // 👈 register Prisma here
await fastify.register(menuRoutes, { prefix: "/menu" }); // 👈 then routes

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
