import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { logger } from '../../../utils/logger.js';

export class RedisService {
  private static instance: RedisService;
  private redisClient: Redis;
  private rateLimiters: Map<string, RateLimiterRedis> = new Map();

  private constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redisClient = new Redis(redisUrl);

    this.setupEventHandlers();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventHandlers() {
    this.redisClient.on('connect', () => {
      logger.base.info({ category: 'SYSTEM', event: 'REDIS_CONNECTED' }, 'Redis connected');
    });

    this.redisClient.on('error', (error) => {
      logger.error.log(error, { service: 'redis' });
    });

    this.redisClient.on('close', () => {
      logger.base.warn({ category: 'SYSTEM', event: 'REDIS_DISCONNECTED' }, 'Redis disconnected');
    });
  }

  // Rate limiting functionality
  public getRateLimiter(name: string, options: {
    points: number;
    duration: number;
    blockDuration?: number;
  }): RateLimiterRedis {
    if (!this.rateLimiters.has(name)) {
      const limiter = new RateLimiterRedis({
        storeClient: this.redisClient,
        keyPrefix: `rl_${name}`,
        points: options.points,
        duration: options.duration,
        blockDuration: options.blockDuration || options.duration,
      });
      this.rateLimiters.set(name, limiter);
    }
    return this.rateLimiters.get(name)!;
  }

  // Session management
  public async setSession(sessionId: string, data: any, ttl: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.setex(key, ttl, JSON.stringify(data));
  }

  public async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    const data = await this.redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.del(key);
  }

  public async extendSession(sessionId: string, ttl: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.redisClient.expire(key, ttl);
  }

  // Order tracking for duplicate prevention
  public async setRecentOrder(key: string, timestamp: number, windowMs: number): Promise<void> {
    const redisKey = `recent_order:${key}`;
    await this.redisClient.setex(redisKey, Math.ceil(windowMs / 1000), timestamp.toString());
  }

  public async getRecentOrder(key: string): Promise<number | null> {
    const redisKey = `recent_order:${key}`;
    const timestamp = await this.redisClient.get(redisKey);
    return timestamp ? parseInt(timestamp) : null;
  }

  // Cache functionality
  public async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.redisClient.setex(key, ttl, serialized);
    } else {
      await this.redisClient.set(key, serialized);
    }
  }

  public async get(key: string): Promise<any | null> {
    const value = await this.redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async del(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  // Set operations for tracking active items
  public async sadd(key: string, ...members: string[]): Promise<void> {
    await this.redisClient.sadd(key, ...members);
  }

  public async srem(key: string, ...members: string[]): Promise<void> {
    await this.redisClient.srem(key, ...members);
  }

  public async smembers(key: string): Promise<string[]> {
    return await this.redisClient.smembers(key);
  }

  public async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.redisClient.sismember(key, member);
    return result === 1;
  }

  // Pub/Sub for real-time updates
  public async publish(channel: string, message: any): Promise<void> {
    await this.redisClient.publish(channel, JSON.stringify(message));
  }

  public subscribe(channel: string, callback: (message: any) => void): void {
    const subscriber = this.redisClient.duplicate();
    subscriber.subscribe(channel);
    subscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          logger.error.log(error as Error, { channel, message });
        }
      }
    });
  }

  // Health check
  public async ping(): Promise<boolean> {
    try {
      const result = await this.redisClient.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // Cleanup and shutdown
  public async disconnect(): Promise<void> {
    await this.redisClient.quit();
  }

  // Get raw client for advanced operations
  public getClient(): Redis {
    return this.redisClient;
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();