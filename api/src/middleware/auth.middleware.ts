import { FastifyRequest, FastifyReply } from "fastify";
import { verifyToken, JWTPayload } from "../utils/jwt";

// Extend FastifyRequest to include staff info
declare module 'fastify' {
  interface FastifyRequest {
    staff?: JWTPayload;
  }
}

export const authenticateStaff = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Access token required' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);
    
    // Add staff info to request object
    request.staff = payload;
    
  } catch (error) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
export const requireRole = (allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.staff) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(request.staff.role)) {
      return reply.status(403).send({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: request.staff.role
      });
    }
  };
};

// Check if staff can access specific restaurant data
export const requireRestaurantAccess = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.staff) {
    return reply.status(401).send({ error: 'Authentication required' });
  }

  // Extract restaurantId from various sources (with proper typing)
  const params = request.params as any;
  const query = request.query as any;
  const body = request.body as any;
  
  const restaurantId = 
    params?.restaurantId || 
    query?.restaurantId || 
    body?.restaurantId;

  if (restaurantId && restaurantId !== request.staff.restaurantId) {
    return reply.status(403).send({ error: 'Access denied to this restaurant' });
  }
};