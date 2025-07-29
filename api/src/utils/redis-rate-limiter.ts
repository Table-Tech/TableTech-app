import { createClient, RedisClientType } from 'redis';
import { logger } from './logger.js';

/**
 * Redis-based rate limiter for production scalability
 * Better than in-memory rate limiting for multi-instance deployments
 */
export class RedisRateLimiter {
  private static instance: RedisRateLimiter;
  private redisClient: RedisClientType;

  private constructor() {
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.redisClient.on('error', (err) => {
      logger.error.log(err, { service: 'redis-rate-limiter' });
    });

    this.redisClient.connect().catch((err) => {
      logger.error.log(err, { service: 'redis-rate-limiter', operation: 'connect' });
    });
  }

  public static getInstance(): RedisRateLimiter {
    if (!RedisRateLimiter.instance) {
      RedisRateLimiter.instance = new RedisRateLimiter();
    }
    return RedisRateLimiter.instance;
  }

  /**
   * Check if request should be rate limited
   * @param key - Unique identifier for the rate limit (e.g., IP address)
   * @param maxRequests - Maximum requests allowed
   * @param windowSeconds - Time window in seconds
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  public async checkRateLimit(
    key: string,
    maxRequests: number = 5,
    windowSeconds: number = 60
  ): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalRequests: number;
  }> {
    try {
      const redisKey = `rate_limit:${key}`;
      const now = Date.now();
      const windowStart = now - (windowSeconds * 1000);

      // Use Redis sorted set to track requests with timestamps
      const multi = this.redisClient.multi();
      
      // Remove old entries outside the window
      multi.zRemRangeByScore(redisKey, 0, windowStart);
      
      // Add current request
      multi.zAdd(redisKey, { score: now, value: `${now}` });
      
      // Count current requests in window
      multi.zCard(redisKey);
      
      // Set expiry on the key
      multi.expire(redisKey, windowSeconds);
      
      const results = await multi.exec();
      const requestCount = (results?.[2] as unknown) as number || 0;

      const allowed = requestCount <= maxRequests;
      const remaining = Math.max(0, maxRequests - requestCount);
      const resetTime = now + (windowSeconds * 1000);

      if (!allowed) {
        logger.security.rateLimitExceeded(key, 'payment-endpoint', requestCount);
      }

      return {
        allowed,
        remaining,
        resetTime,
        totalRequests: requestCount
      };
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'redis-rate-limiter',
        operation: 'checkRateLimit',
        key
      });
      
      // On Redis error, allow request but log the issue
      return {
        allowed: true,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalRequests: 0
      };
    }
  }

  /**
   * Generate rate limit key for different scenarios
   */
  public static generateKey(ip: string, endpoint: string, userId?: string): string {
    return userId 
      ? `${ip}:${endpoint}:${userId}`
      : `${ip}:${endpoint}`;
  }

  /**
   * Cleanup method for graceful shutdown
   */
  public async disconnect(): Promise<void> {
    try {
      await this.redisClient.quit();
    } catch (error) {
      logger.error.log(error as Error, {
        service: 'redis-rate-limiter',
        operation: 'disconnect'
      });
    }
  }
}