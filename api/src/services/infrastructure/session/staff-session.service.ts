import { PrismaClient, StaffSession } from '@prisma/client';
import { redisService } from '../redis/redis.service.js';
import { ApiError } from '../../../types/errors.js';
import { logger } from '../../../utils/logger.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface CreateStaffSessionDTO {
  staffId: string;
  deviceInfo?: string;
  userAgent?: string;
  deviceName?: string;
  refreshToken?: string; // We'll hash this before storing
}

export interface StaffSessionData {
  sessionId: string;
  staffId: string;
  staffName: string;
  staffEmail: string;
  role: string;
  restaurantId?: string;
  restaurantName?: string;
  deviceInfo?: string;
  deviceName?: string;
  isActive: boolean;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: StaffSessionData;
  reason?: string;
}

export class StaffSessionService {
  private prisma: PrismaClient;
  // Make session durations configurable via environment variables
  private readonly SESSION_DURATION = parseInt(process.env.STAFF_SESSION_DURATION_HOURS || '24') * 60 * 60 * 1000; // Default 24 hours
  private readonly REDIS_TTL = parseInt(process.env.STAFF_SESSION_DURATION_HOURS || '24') * 60 * 60; // Same duration in seconds
  private readonly ACTIVITY_UPDATE_THRESHOLD = parseInt(process.env.SESSION_ACTIVITY_THRESHOLD_MINUTES || '5') * 60 * 1000; // Default 5 minutes

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Create new staff session on login
   */
  async createSession(data: CreateStaffSessionDTO): Promise<StaffSession> {
    try {
      // 1. Check if user has reached concurrent session limit
      const staff = await this.prisma.staff.findUnique({
        where: { id: data.staffId },
        include: {
          sessions: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' }
          },
          restaurant: true
        }
      });

      if (!staff) {
        throw new ApiError(404, 'STAFF_NOT_FOUND', 'Staff member not found');
      }

      // 2. Enforce concurrent session limits
      if (staff.sessions.length >= staff.maxConcurrentSessions) {
        // Revoke oldest session
        const oldestSession = staff.sessions[staff.sessions.length - 1];
        await this.revokeSession(oldestSession.sessionId, 'session_limit_exceeded', 'system');
        
        logger.base.warn({
          category: 'SECURITY',
          event: 'SESSION_LIMIT_ENFORCED',
          staffId: data.staffId,
          revokedSessionId: oldestSession.sessionId
        }, 'Concurrent session limit enforced, oldest session revoked');
      }

      // 3. Generate session ID and expiry
      const sessionId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

      // 4. Hash refresh token if provided
      let refreshTokenHash: string | null = null;
      if (data.refreshToken) {
        refreshTokenHash = await bcrypt.hash(data.refreshToken, 10);
      }

      // 5. Extract device info from user agent
      const deviceInfo = data.deviceInfo || this.parseUserAgent(data.userAgent);

      // 6. Create session in database
      const session = await this.prisma.staffSession.create({
        data: {
          sessionId,
          staffId: data.staffId,
          deviceInfo,
          userAgent: data.userAgent,
          deviceName: data.deviceName,
          refreshTokenHash,
          expiresAt
        }
      });

      // 7. Cache session data in Redis
      const sessionData: StaffSessionData = {
        sessionId,
        staffId: staff.id,
        staffName: staff.name,
        staffEmail: staff.email,
        role: staff.role,
        restaurantId: staff.restaurant?.id,
        restaurantName: staff.restaurant?.name,
        deviceInfo,
        deviceName: data.deviceName,
        isActive: true,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt
      };

      await redisService.set(
        `staff_session:${sessionId}`,
        sessionData,
        this.REDIS_TTL
      );

      // 8. Update staff last login
      await this.prisma.staff.update({
        where: { id: data.staffId },
        data: { 
          lastLoginAt: new Date(),
          loginAttempts: 0, // Reset failed attempts on successful login
          lockedUntil: null // Clear any lockout
        }
      });

      // 9. Log session creation
      logger.security.login(staff.id, staff.email, data.deviceName, sessionId);

      return session;

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'staff-session',
        operation: 'createSession',
        staffId: data.staffId
      });
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(500, 'SESSION_CREATION_FAILED', 'Failed to create session');
    }
  }

  /**
   * Validate session and check if it's active
   */
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    try {
      // 1. Check Redis cache first (fast path)
      let sessionData = await redisService.get(`staff_session:${sessionId}`) as StaffSessionData;

      if (!sessionData) {
        // 2. Check database (slower fallback)
        const dbSession = await this.prisma.staffSession.findUnique({
          where: { sessionId },
          include: {
            staff: {
              include: { restaurant: true }
            }
          }
        });

        if (!dbSession) {
          return { 
            valid: false, 
            reason: 'Session not found' 
          };
        }

        if (!dbSession.isActive) {
          return { 
            valid: false, 
            reason: `Session revoked: ${dbSession.revokeReason || 'unknown'}` 
          };
        }

        if (new Date() > dbSession.expiresAt) {
          // Mark as expired
          await this.revokeSession(sessionId, 'expired', 'system');
          return { 
            valid: false, 
            reason: 'Session expired' 
          };
        }

        // Rebuild cache from database
        sessionData = {
          sessionId: dbSession.sessionId,
          staffId: dbSession.staff.id,
          staffName: dbSession.staff.name,
          staffEmail: dbSession.staff.email,
          role: dbSession.staff.role,
          restaurantId: dbSession.staff.restaurant?.id,
          restaurantName: dbSession.staff.restaurant?.name,
          deviceInfo: dbSession.deviceInfo || undefined,
          deviceName: dbSession.deviceName || undefined,
          isActive: dbSession.isActive,
          createdAt: dbSession.createdAt,
          lastActiveAt: dbSession.lastActiveAt,
          expiresAt: dbSession.expiresAt
        };

        // Cache for future requests
        const ttl = Math.floor((dbSession.expiresAt.getTime() - Date.now()) / 1000);
        if (ttl > 0) {
          await redisService.set(`staff_session:${sessionId}`, sessionData, ttl);
        }
      }

      // 3. Validate session is still active
      if (!sessionData.isActive) {
        return { 
          valid: false, 
          reason: 'Session is not active' 
        };
      }

      // 4. Check expiration
      if (new Date() > new Date(sessionData.expiresAt)) {
        await this.revokeSession(sessionId, 'expired', 'system');
        return { 
          valid: false, 
          reason: 'Session expired' 
        };
      }

      // 5. Update activity timestamp (throttled)
      await this.updateActivity(sessionId);

      return { 
        valid: true, 
        session: sessionData 
      };

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'staff-session',
        operation: 'validateSession',
        sessionId
      });
      
      return { 
        valid: false, 
        reason: 'Session validation failed' 
      };
    }
  }

  /**
   * Validate refresh token for a session
   */
  async validateRefreshToken(sessionId: string, refreshToken: string): Promise<boolean> {
    try {
      const session = await this.prisma.staffSession.findUnique({
        where: { sessionId }
      });

      if (!session || !session.refreshTokenHash) {
        return false;
      }

      return await bcrypt.compare(refreshToken, session.refreshTokenHash);
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'staff-session',
        operation: 'validateRefreshToken',
        sessionId
      });
      return false;
    }
  }

  /**
   * Update session activity timestamp
   */
  private async updateActivity(sessionId: string): Promise<void> {
    try {
      const now = new Date();

      // Update Redis immediately
      const sessionData = await redisService.get(`staff_session:${sessionId}`) as StaffSessionData;
      if (sessionData) {
        // Only update if last update was more than threshold ago
        if (new Date(sessionData.lastActiveAt).getTime() + this.ACTIVITY_UPDATE_THRESHOLD < now.getTime()) {
          sessionData.lastActiveAt = now;
          
          const ttl = Math.floor((new Date(sessionData.expiresAt).getTime() - now.getTime()) / 1000);
          if (ttl > 0) {
            await redisService.set(`staff_session:${sessionId}`, sessionData, ttl);
          }

          // Update database asynchronously
          this.prisma.staffSession.update({
            where: { sessionId },
            data: { lastActiveAt: now }
          }).catch(error => {
            logger.error.log(error, {
              service: 'staff-session',
              operation: 'updateActivity',
              sessionId
            });
          });
        }
      }
    } catch (error) {
      // Don't throw - activity updates are non-critical
      logger.error.log(error as Error, {
        service: 'staff-session',
        operation: 'updateActivity',
        sessionId
      });
    }
  }

  /**
   * Extend session expiration
   */
  async extendSession(sessionId: string, hours: number = 24): Promise<Date> {
    try {
      const newExpiresAt = new Date(Date.now() + (hours * 60 * 60 * 1000));

      // Update database
      await this.prisma.staffSession.update({
        where: { sessionId },
        data: { expiresAt: newExpiresAt }
      });

      // Update Redis
      const sessionData = await redisService.get(`staff_session:${sessionId}`) as StaffSessionData;
      if (sessionData) {
        sessionData.expiresAt = newExpiresAt;
        await redisService.set(`staff_session:${sessionId}`, sessionData, hours * 60 * 60);
      }

      logger.base.info({
        category: 'SESSION',
        event: 'SESSION_EXTENDED',
        sessionId,
        newExpiresAt
      }, 'Session extended');

      return newExpiresAt;

    } catch (error) {
      throw new ApiError(500, 'SESSION_EXTEND_FAILED', 'Failed to extend session');
    }
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string, reason: string, revokedBy: string): Promise<void> {
    try {
      // 1. Update database
      await this.prisma.staffSession.update({
        where: { sessionId },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy,
          revokeReason: reason
        }
      });

      // 2. Remove from Redis
      await redisService.del(`staff_session:${sessionId}`);

      // 3. Log revocation
      const session = await this.prisma.staffSession.findUnique({
        where: { sessionId },
        select: { staffId: true }
      });
      if (session) {
        logger.security.sessionRevoked(sessionId, session.staffId, reason, revokedBy);
      }

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'staff-session',
        operation: 'revokeSession',
        sessionId,
        reason
      });
      throw new ApiError(500, 'SESSION_REVOKE_FAILED', 'Failed to revoke session');
    }
  }

  /**
   * Revoke all sessions for a staff member
   */
  async revokeAllUserSessions(staffId: string, reason: string, revokedBy: string): Promise<number> {
    try {
      // 1. Get all active sessions
      const sessions = await this.prisma.staffSession.findMany({
        where: {
          staffId,
          isActive: true
        }
      });

      // 2. Revoke each session
      for (const session of sessions) {
        await this.revokeSession(session.sessionId, reason, revokedBy);
      }

      logger.security.allSessionsRevoked(staffId, reason, revokedBy, sessions.length);

      return sessions.length;

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'staff-session',
        operation: 'revokeAllUserSessions',
        staffId
      });
      throw new ApiError(500, 'REVOKE_ALL_FAILED', 'Failed to revoke all sessions');
    }
  }

  /**
   * Get active sessions for a staff member
   */
  async getActiveSessions(staffId: string): Promise<StaffSession[]> {
    try {
      return await this.prisma.staffSession.findMany({
        where: {
          staffId,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { lastActiveAt: 'desc' }
      });
    } catch (error) {
      throw new ApiError(500, 'GET_SESSIONS_FAILED', 'Failed to get active sessions');
    }
  }

  /**
   * Get all active sessions (admin only)
   */
  async getAllActiveSessions(restaurantId?: string): Promise<StaffSession[]> {
    try {
      const where: any = {
        isActive: true,
        expiresAt: { gt: new Date() }
      };

      if (restaurantId) {
        where.staff = { restaurantId };
      }

      return await this.prisma.staffSession.findMany({
        where,
        include: {
          staff: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              restaurant: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        orderBy: { lastActiveAt: 'desc' }
      });
    } catch (error) {
      throw new ApiError(500, 'GET_ALL_SESSIONS_FAILED', 'Failed to get all sessions');
    }
  }

  /**
   * Clean up expired sessions (run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await this.prisma.staffSession.updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: new Date() }
        },
        data: {
          isActive: false,
          revokedAt: new Date(),
          revokedBy: 'system',
          revokeReason: 'expired'
        }
      });

      logger.base.info({
        category: 'SYSTEM',
        event: 'SESSION_CLEANUP',
        count: result.count
      }, `Cleaned up ${result.count} expired staff sessions`);

      return result.count;

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'staff-session',
        operation: 'cleanupExpiredSessions'
      });
      return 0;
    }
  }

  /**
   * Parse user agent string to extract device info
   */
  private parseUserAgent(userAgent?: string): string | undefined {
    if (!userAgent) return undefined;

    // Simple parsing - could be enhanced with a UA parser library
    if (userAgent.includes('Mobile')) {
      if (userAgent.includes('iPhone')) return 'iPhone Safari';
      if (userAgent.includes('Android')) return 'Android Browser';
      return 'Mobile Browser';
    }

    if (userAgent.includes('Chrome')) return 'Chrome on Desktop';
    if (userAgent.includes('Firefox')) return 'Firefox on Desktop';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari on Desktop';
    if (userAgent.includes('Edge')) return 'Edge on Desktop';

    return 'Unknown Browser';
  }
}

// Create singleton instance
export const staffSessionService = new StaffSessionService(new PrismaClient());