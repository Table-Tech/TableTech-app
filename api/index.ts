// api/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import menuRoutes from './src/routes/menu/index.js'; // we’ll create this next


const fastify  = Fastify({ logger: true });

await fastify.register(menuRoutes, { prefix: "/menu" });

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
