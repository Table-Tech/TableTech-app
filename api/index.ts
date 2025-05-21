// api/index.ts
import Fastify from 'fastify';
import cors from '@fastify/cors';
import menuRoutes from './src/routes/menu.js'; // we’ll create this next

const server = Fastify({ logger: true });

await server.register(cors);
await server.register(menuRoutes, { prefix: '/menu' });

const start = async () => {
  try {
    await server.listen({ port: 3001, host: '0.0.0.0' });
    console.log('✅ Fastify API running on http://localhost:3001');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
