// api/routes/menu.ts
import { FastifyPluginAsync } from 'fastify';

const menuRoutes: FastifyPluginAsync = async (server) => {
  server.get('/', async (request, reply) => {
    return { message: '📋 Menu route working!' };
  });
};

export default menuRoutes;
