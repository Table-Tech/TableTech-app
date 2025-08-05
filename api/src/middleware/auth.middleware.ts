// src/middleware/auth.middleware.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { verifyToken, JWTPayload } from '../utils/jwt.js';
import { ApiError } from '../types/errors.js';
import { staffSessionService } from '../services/infrastructure/session/staff-session.service.js';

/**
 * Generic extension of FastifyRequest that carries our JWT payload.
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
    
    // Validate session if sessionId is present in JWT
    if (payload.sessionId) {
      const sessionValidation = await staffSessionService.validateSession(payload.sessionId);
      
      if (!sessionValidation.valid) {
        throw new ApiError(401, 'SESSION_INVALID', sessionValidation.reason || 'Session is not valid');
      }
      
      // Update payload with latest session data (in case role changed, etc.)
      if (sessionValidation.session) {
        payload.role = sessionValidation.session.role;
        payload.restaurantId = sessionValidation.session.restaurantId || null;
      }
    }
    
    (req as AuthenticatedRequest).user = payload;
    
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid or expired token');
  }
};

/**
 * Require specific roles
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireUser(req, reply); // Ensure user is authenticated first
    
    const user = (req as AuthenticatedRequest).user;
    
    if (!allowedRoles.includes(user.role)) {
      throw new ApiError(403, 'FORBIDDEN', `Required roles: ${allowedRoles.join(', ')}`);
    }
  };
};

/**
 * Shortcuts for common role checks
 */
export const requireSuperAdmin = requireRole(['SUPER_ADMIN']);
export const requireAdmin = requireRole(['SUPER_ADMIN', 'ADMIN']);
export const requireManager = requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER']);
export const requireStaff = requireRole(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'CHEF', 'WAITER', 'CASHIER']);

/**
 * Ensure user can only access their own restaurant's data (unless SUPER_ADMIN)
 */
export const requireRestaurantAccess = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  // SUPER_ADMIN can access any restaurant
  if (user.role === 'SUPER_ADMIN') {
    return;
  }

  // Extract restaurantId from request
  const params = req.params as any;
  const query = req.query as any;
  const body = req.body as any;
  
  const requestedRestaurantId = 
    params?.restaurantId || 
    query?.restaurantId || 
    body?.restaurantId;

  if (requestedRestaurantId && requestedRestaurantId !== user.restaurantId) {
    throw new ApiError(403, 'FORBIDDEN', 'Access denied to this restaurant');
  }
};

/**
 * Ensure user has a restaurantId (not SUPER_ADMIN with null restaurantId)
 * Use this for routes that require a specific restaurant context
 */
export const requireRestaurantId = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const user = (req as AuthenticatedRequest).user;
  
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  if (!user.restaurantId) {
    throw new ApiError(400, 'RESTAURANT_REQUIRED', 'Restaurant context required for this operation');
  }
};

/**
 * Get restaurantId from user context or route params (for SUPER_ADMIN)
 * Helper function for controllers to handle both cases
 */
export const getRestaurantId = (req: AuthenticatedRequest): string => {
  const user = req.user;
  
  // For regular users, use their restaurantId
  if (user.restaurantId) {
    return user.restaurantId;
  }
  
  // For SUPER_ADMIN, try to get from restaurant context header first, then route params/query
  const restaurantContext = req.headers['x-restaurant-context'] as string;
  const params = req.params as any;
  const query = req.query as any;
  
  const restaurantId = restaurantContext || params?.restaurantId || query?.restaurantId;
  
  if (!restaurantId) {
    throw new ApiError(400, 'RESTAURANT_ID_REQUIRED', 'Restaurant context must be provided for SUPER_ADMIN');
  }
  
  return restaurantId;
};

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
export const optionalUser = async (
  req: FastifyRequest,
  reply: FastifyReply
) => {
  const auth = req.headers.authorization;
  
  if (auth?.startsWith('Bearer ')) {
    const token = auth.slice(7);
    
    try {
      const payload = verifyToken(token);
      
      // Validate session if sessionId is present (but don't fail if invalid for optional auth)
      if (payload.sessionId) {
        const sessionValidation = await staffSessionService.validateSession(payload.sessionId);
        
        if (sessionValidation.valid && sessionValidation.session) {
          // Update payload with latest session data
          payload.role = sessionValidation.session.role;
          payload.restaurantId = sessionValidation.session.restaurantId || null;
          (req as AuthenticatedRequest).user = payload;
        }
        // If session invalid, don't attach user (treat as unauthenticated)
      } else {
        // No sessionId, use JWT as-is (backward compatibility)
        (req as AuthenticatedRequest).user = payload;
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }
  }
};