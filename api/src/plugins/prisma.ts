import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { FastifyPluginAsync } from "fastify";

// Declare the prisma property on FastifyInstance
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient();
  
  // Connect to database
  await prisma.$connect();
  
  // Add prisma to fastify instance
  fastify.decorate("prisma", prisma);
  
  // Graceful shutdown
  fastify.addHook('onClose', async (instance) => {
    await instance.prisma.$disconnect();
  });
}

export default fp(prismaPlugin, {
  name: 'prisma',
  fastify: '5.x'
});