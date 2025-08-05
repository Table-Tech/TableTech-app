// services/base.service.ts
import { PrismaClient } from '@prisma/client';

/**
 * Base service class with common CRUD operations
 * Extended by all service classes for consistent data access patterns
 */
// Singleton Prisma instance for connection pooling
let prismaInstance: PrismaClient | null = null;

export function getPrismaInstance(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaInstance;
}

export abstract class BaseService<CreateInput, Model> {
  protected prisma: PrismaClient;
  protected abstract model: keyof PrismaClient;

  constructor() {
    this.prisma = getPrismaInstance();
  }

  /**
   * Find record by ID
   */
  async findById(id: string): Promise<Model | null> {
    return (this.prisma[this.model] as any).findUnique({
      where: { id }
    });
  }

  /**
   * Find many records with optional filters
   */
  async findMany(where?: any, options?: {
    include?: any;
    orderBy?: any;
    take?: number;
    skip?: number;
  }): Promise<Model[]> {
    return (this.prisma[this.model] as any).findMany({
      where,
      ...options
    });
  }

  /**
   * Count records with optional filters
   */
  async count(where?: any): Promise<number> {
    return (this.prisma[this.model] as any).count({ where });
  }

  /**
   * Check if record exists
   */
  async exists(where: any): Promise<boolean> {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Delete record by ID
   */
  async deleteById(id: string): Promise<Model> {
    return (this.prisma[this.model] as any).delete({
      where: { id }
    });
  }

  /**
   * Cleanup resources
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}