import { PrismaClient } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

export abstract class BaseService<TInput, TOutput> {
  protected prisma: PrismaClient = prisma;
  protected abstract model: keyof PrismaClient;

  /**
   * Create a new record
   */
  async create(data: TInput): Promise<TOutput> {
    return (this.prisma[this.model] as any).create({ data });
  }

  /**
   * Find a record by ID
   */
  async findById(id: string): Promise<TOutput | null> {
    return (this.prisma[this.model] as any).findUnique({ where: { id } });
  }

  /**
   * Find multiple records with optional filtering
   */
  async findMany(where: any = {}, options: {
    orderBy?: any;
    take?: number;
    skip?: number;
    include?: any;
    select?: any;
  } = {}): Promise<TOutput[]> {
    return (this.prisma[this.model] as any).findMany({
      where,
      ...options
    });
  }

  /**
   * Update a record by ID
   */
  async update(id: string, data: Partial<TInput>): Promise<TOutput> {
    return (this.prisma[this.model] as any).update({ 
      where: { id }, 
      data 
    });
  }

  /**
   * Delete a record by ID
   */
  async delete(id: string): Promise<TOutput> {
    return (this.prisma[this.model] as any).delete({ where: { id } });
  }

  /**
   * Count records with optional filtering
   */
  async count(where: any = {}): Promise<number> {
    return (this.prisma[this.model] as any).count({ where });
  }

  /**
   * Check if a record exists by ID
   */
  async exists(id: string): Promise<boolean> {
    const record = await this.findById(id);
    return record !== null;
  }

  /**
   * Paginated find with total count
   */
  async findManyPaginated(
    where: any = {},
    page: number = 1,
    limit: number = 20,
    options: {
      orderBy?: any;
      include?: any;
      select?: any;
    } = {}
  ): Promise<{
    data: TOutput[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.findMany(where, { ...options, take: limit, skip }),
      this.count(where)
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext: page < pages,
        hasPrev: page > 1
      }
    };
  }
}