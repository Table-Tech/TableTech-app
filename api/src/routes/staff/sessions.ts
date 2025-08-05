import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest, requireUser, requireAdmin } from '../../middleware/auth.middleware.js';
import { staffSessionService } from '../../services/infrastructure/session/staff-session.service.js';
import { ApiError } from '../../types/errors.js';

// Schema for revoking a session
const RevokeSessionSchema = z.object({
  reason: z.string().optional()
});

// JSON Schema for Fastify validation
const revokeSessionJsonSchema = {
  type: 'object',
  properties: {
    reason: { type: 'string' }
  },
  additionalProperties: false
} as const;

export default async function sessionRoutes(fastify: FastifyInstance) {
  // Get current user's active sessions
  fastify.get('/sessions', {
    preHandler: requireUser,
    handler: async (req, reply) => {
      const user = (req as AuthenticatedRequest).user;
      const sessions = await staffSessionService.getActiveSessions(user.staffId);
      
      // Mark current session
      const currentSessionId = user.sessionId;
      const sessionsWithCurrent = sessions.map(session => ({
        ...session,
        isCurrent: session.sessionId === currentSessionId
      }));

      return reply.send({
        success: true,
        data: sessionsWithCurrent
      });
    }
  });

  // Revoke one of current user's sessions
  fastify.delete<{
    Params: { sessionId: string };
    Body: z.infer<typeof RevokeSessionSchema>;
  }>('/sessions/:sessionId', {
    preHandler: requireUser,
    schema: {
      params: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', format: 'uuid' }
        },
        required: ['sessionId']
      },
      body: revokeSessionJsonSchema
    },
    handler: async (req, reply) => {
      const user = (req as AuthenticatedRequest).user;
      
      // Verify the session belongs to the current user
      const sessions = await staffSessionService.getActiveSessions(user.staffId);
      const sessionToRevoke = sessions.find(s => s.sessionId === req.params.sessionId);
      
      if (!sessionToRevoke) {
        throw new ApiError(404, 'SESSION_NOT_FOUND', 'Session not found');
      }

      // Don't allow revoking current session (use logout instead)
      if (user.sessionId === req.params.sessionId) {
        throw new ApiError(400, 'CANNOT_REVOKE_CURRENT', 'Cannot revoke current session. Use logout instead.');
      }

      await staffSessionService.revokeSession(
        req.params.sessionId,
        req.body.reason || 'manual_revoke',
        user.staffId
      );

      return reply.send({
        success: true,
        message: 'Session revoked successfully'
      });
    }
  });

  // Revoke all sessions except current
  fastify.post('/sessions/revoke-all', {
    preHandler: requireUser,
    handler: async (req, reply) => {
      const user = (req as AuthenticatedRequest).user;
      const sessions = await staffSessionService.getActiveSessions(user.staffId);
      let revokedCount = 0;

      for (const session of sessions) {
        if (session.sessionId !== user.sessionId) {
          await staffSessionService.revokeSession(
            session.sessionId,
            'revoke_all',
            user.staffId
          );
          revokedCount++;
        }
      }

      return reply.send({
        success: true,
        message: `Revoked ${revokedCount} session(s)`,
        data: { revokedCount }
      });
    }
  });

  // Admin endpoints
  
  // Get all active sessions (admin only)
  fastify.get('/admin/sessions', {
    preHandler: requireAdmin,
    handler: async (req, reply) => {
      const user = (req as AuthenticatedRequest).user;
      // For non-super admins, filter by their restaurant
      const restaurantId = user.role === 'SUPER_ADMIN' ? undefined : user.restaurantId || undefined;
      const sessions = await staffSessionService.getAllActiveSessions(restaurantId);

      return reply.send({
        success: true,
        data: sessions
      });
    }
  });

  // Get sessions for a specific staff member (admin only)
  fastify.get<{
    Params: { staffId: string };
  }>('/admin/sessions/staff/:staffId', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        properties: {
          staffId: { type: 'string', format: 'uuid' }
        },
        required: ['staffId']
      }
    },
    handler: async (req, reply) => {
      const sessions = await staffSessionService.getActiveSessions(req.params.staffId);

      return reply.send({
        success: true,
        data: sessions
      });
    }
  });

  // Revoke any session (admin only)
  fastify.delete<{
    Params: { sessionId: string };
    Body: z.infer<typeof RevokeSessionSchema>;
  }>('/admin/sessions/:sessionId', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        properties: {
          sessionId: { type: 'string', format: 'uuid' }
        },
        required: ['sessionId']
      },
      body: revokeSessionJsonSchema
    },
    handler: async (req, reply) => {
      const user = (req as AuthenticatedRequest).user;
      await staffSessionService.revokeSession(
        req.params.sessionId,
        req.body.reason || 'admin_revoke',
        user.staffId
      );

      return reply.send({
        success: true,
        message: 'Session revoked successfully'
      });
    }
  });

  // Revoke all sessions for a staff member (admin only)
  fastify.post<{
    Params: { staffId: string };
    Body: z.infer<typeof RevokeSessionSchema>;
  }>('/admin/sessions/staff/:staffId/revoke-all', {
    preHandler: requireAdmin,
    schema: {
      params: {
        type: 'object',
        properties: {
          staffId: { type: 'string', format: 'uuid' }
        },
        required: ['staffId']
      },
      body: revokeSessionJsonSchema
    },
    handler: async (req, reply) => {
      const user = (req as AuthenticatedRequest).user;
      const count = await staffSessionService.revokeAllUserSessions(
        req.params.staffId,
        req.body.reason || 'admin_revoke_all',
        user.staffId
      );

      return reply.send({
        success: true,
        message: `Revoked ${count} session(s)`,
        data: { revokedCount: count }
      });
    }
  });

  // Cleanup expired sessions (admin only, manual trigger)
  fastify.post('/admin/sessions/cleanup', {
    preHandler: requireAdmin,
    handler: async (req, reply) => {
      const count = await staffSessionService.cleanupExpiredSessions();

      return reply.send({
        success: true,
        message: `Cleaned up ${count} expired session(s)`,
        data: { cleanedCount: count }
      });
    }
  });
}