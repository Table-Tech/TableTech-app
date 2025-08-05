import { PrismaClient } from '@prisma/client';
import { staffSessionService } from '../services/infrastructure/session/staff-session.service.js';
import { logger } from '../utils/logger.js';

export class SessionCleanupJob {
  private prisma: PrismaClient;
  private interval: NodeJS.Timeout | null = null;
  // Make cleanup interval configurable via environment variables
  private readonly CLEANUP_INTERVAL = parseInt(process.env.SESSION_CLEANUP_INTERVAL_MINUTES || '60') * 60 * 1000; // Default 1 hour

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Start the periodic cleanup job
   */
  start(): void {
    // Run cleanup immediately on start
    this.cleanup();

    // Schedule periodic cleanup
    this.interval = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    logger.base.info({
      category: 'SYSTEM',
      event: 'JOB_STARTED',
      job: 'session-cleanup',
      interval: this.CLEANUP_INTERVAL
    }, 'Session cleanup job started');
  }

  /**
   * Stop the cleanup job
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      
      logger.base.info({
        category: 'SYSTEM',
        event: 'JOB_STOPPED',
        job: 'session-cleanup'
      }, 'Session cleanup job stopped');
    }
  }

  /**
   * Run the cleanup process
   */
  private async cleanup(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Cleanup staff sessions
      const staffSessionsCleanedCount = await staffSessionService.cleanupExpiredSessions();
      
      const duration = Date.now() - startTime;
      
      logger.base.info({
        category: 'SYSTEM',
        event: 'SESSION_CLEANUP_COMPLETED',
        staffSessions: staffSessionsCleanedCount,
        durationMs: duration
      }, `Session cleanup completed: ${staffSessionsCleanedCount} staff sessions cleaned`);

    } catch (error) {
      logger.error.log(error as Error, {
        service: 'session-cleanup-job',
        operation: 'cleanup'
      });
    }
  }

  /**
   * Run cleanup once (for manual triggers)
   */
  async runOnce(): Promise<{ staff: number }> {
    const staffSessionsCleanedCount = await staffSessionService.cleanupExpiredSessions();
    
    return {
      staff: staffSessionsCleanedCount
    };
  }
}

// Create and export singleton instance
let sessionCleanupJob: SessionCleanupJob | null = null;

export const initializeSessionCleanupJob = (prisma: PrismaClient): SessionCleanupJob => {
  if (!sessionCleanupJob) {
    sessionCleanupJob = new SessionCleanupJob(prisma);
  }
  return sessionCleanupJob;
};

export const getSessionCleanupJob = (): SessionCleanupJob => {
  if (!sessionCleanupJob) {
    throw new Error('Session cleanup job not initialized. Call initializeSessionCleanupJob first.');
  }
  return sessionCleanupJob;
};