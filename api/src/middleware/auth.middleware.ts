// src/middleware/auth.middleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken, JWTPayload } from '../utils/jwt.js';
import { ApiError } from '../types/errors.js';

/**
 * Generic extension of FastifyRequest that carries our JWT payload.
 *
 * B = Body schema
 * P = Params schema
 * Q = Query schema
 */
export interface AuthenticatedRequest<
  B = unknown,
  P = unknown,
  Q = unknown
> extends FastifyRequest<{
  Body: B;
  Params: P;
  Querystring: Q;
}> {
  user: JWTPayload;
}

/**
 * Require a valid JWT, attach payload to req.user
 */
export const requireUser = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const auth = req.headers.authorization;
  
  if (!auth?.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing or malformed authorization header');
  }
  
  const token = auth.slice(7);
  
  if (!token || token.trim() === '') {
    throw new ApiError(401, 'UNAUTHORIZED', 'Empty authentication token');
  }
  
  try {
    const payload = verifyToken(token);
    (req as AuthenticatedRequest).user = payload;
    
    // Log authentication success for audit
    req.log.debug({
      staffId: payload.staffId,
      role: payload.role,
      restaurantId: payload.restaurantId,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, 'User authenticated successfully');
    
  } catch (error) {
    // Log authentication failure for security monitoring
    req.log.warn({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      url: req.url,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 'Authentication failed');
    
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
};

/**
 * Require specific roles (pass array of allowed roles)
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    const user = (req as AuthenticatedRequest).user;
    
    if (!user) {
      throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
    }
    
    if (!allowedRoles.includes(user.role)) {
      req.log.warn({
        staffId: user.staffId,
        currentRole: user.role,
        requiredRoles: allowedRoles,
        url: req.url,
        ip: req.ip
      }, 'Access denied - insufficient role permissions');
      
      throw new ApiError(403, 'FORBIDDEN', `Access denied. Required roles: ${allowedRoles.join(', ')}`);
    }
  };
};

/**
 * Require staff role (shorthand for requireRole(['ADMIN', 'MANAGER', 'CHEF', 'WAITER', 'CASHIER']))
 */
export const requireStaff = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  await requireUser(req, reply);
  const user = (req as AuthenticatedRequest).user;
  
  const staffRoles = ['ADMIN', 'MANAGER', 'CHEF', 'WAITER', 'CASHIER'];
  
  if (!staffRoles.includes(user.role)) {
    req.log.warn({
      staffId: user.staffId,
      currentRole: user.role,
      url: req.url,
      ip: req.ip
    }, 'Access denied - staff access required');
    
    throw new ApiError(403, 'FORBIDDEN', 'Staff access required');
  }
};

/**
 * Ensure staff can only access their own restaurant's data
 */
export const requireRestaurantAccess = async (
  req: FastifyRequest, 
  reply: FastifyReply
) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  // Extract restaurantId from various sources
  const params = req.params as any;
  const query = req.query as any;
  const body = req.body as any;
  
  const requestedRestaurantId = 
    params?.restaurantId || 
    query?.restaurantId || 
    body?.restaurantId;

  // If no restaurantId in request, allow (will use user's restaurant)
  if (!requestedRestaurantId) {
    return;
  }

  // Check if user is trying to access different restaurant
  if (requestedRestaurantId !== user.restaurantId) {
    req.log.warn({
      staffId: user.staffId,
      userRestaurantId: user.restaurantId,
      requestedRestaurantId,
      url: req.url,
      ip: req.ip
    }, 'Access denied - restaurant access violation');
    
    throw new ApiError(403, 'FORBIDDEN', 'Access denied to this restaurant');
  }
};

/**
 * Admin-only access
 */
export const requireAdmin = requireRole(['ADMIN']);

/**
 * Manager or Admin access
 */
export const requireManager = requireRole(['ADMIN', 'MANAGER']);