import { ModifierTemplate, ModifierOption, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';

// DTOs for the new modifier template system
export interface CreateModifierTemplateDTO {
  restaurantId: string;
  name: string;
  description?: string;
  type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  options: Array<{
    name: string;
    price: number;
    displayOrder?: number;
  }>;
}

export interface UpdateModifierTemplateDTO {
  name?: string;
  description?: string;
  type?: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
  isActive?: boolean;
}

export interface CreateModifierOptionDTO {
  templateId: string;
  name: string;
  price: number;
  displayOrder?: number;
}

export interface UpdateModifierOptionDTO {
  name?: string;
  price?: number;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ModifierTemplateQueryDTO {
  restaurantId: string;
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

type ModifierTemplateWithOptions = ModifierTemplate & {
  options: ModifierOption[];
  _count: { menuItems: number };
}

export class ModifierTemplateService extends BaseService<Prisma.ModifierTemplateCreateInput, ModifierTemplate> {
  protected model = 'modifierTemplate' as const;

  /**
   * Create modifier template with options
   */
  async createModifierTemplate(data: CreateModifierTemplateDTO, staffId: string): Promise<ModifierTemplateWithOptions> {
    return await this.prisma.$transaction(async (tx) => {
      // Verify restaurant exists
      const restaurant = await tx.restaurant.findUnique({
        where: { id: data.restaurantId },
        select: { id: true, name: true }
      });

      if (!restaurant) {
        throw new ApiError(404, 'RESTAURANT_NOT_FOUND', 'Restaurant not found');
      }

      // Check for duplicate template name within restaurant
      const existing = await tx.modifierTemplate.findFirst({
        where: { 
          restaurantId: data.restaurantId,
          name: data.name,
          isActive: true
        }
      });

      if (existing) {
        throw new ApiError(409, 'DUPLICATE_NAME', 'A modifier template with this name already exists in this restaurant');
      }

      // Create the modifier template
      const template = await tx.modifierTemplate.create({
        data: {
          restaurantId: data.restaurantId,
          name: data.name,
          description: data.description,
          type: data.type
        },
        include: this.getTemplateIncludes()
      });

      // Create the modifier options
      if (data.options.length > 0) {
        await tx.modifierOption.createMany({
          data: data.options.map((option, index) => ({
            templateId: template.id,
            name: option.name,
            price: option.price,
            displayOrder: option.displayOrder ?? index
          }))
        });
      }

      // Return template with options
      return await tx.modifierTemplate.findUniqueOrThrow({
        where: { id: template.id },
        include: this.getTemplateIncludes()
      });
    });
  }

  /**
   * Get modifier templates with filters and pagination
   */
  async getModifierTemplates(query: ModifierTemplateQueryDTO) {
    const where: Prisma.ModifierTemplateWhereInput = {
      restaurantId: query.restaurantId,
      isActive: query.isActive ?? true
    };

    // Add search filter
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } }
      ];
    }

    const [templates, total] = await Promise.all([
      this.prisma.modifierTemplate.findMany({
        where,
        include: this.getTemplateIncludes(),
        orderBy: [
          { name: 'asc' }
        ],
        take: query.limit || 50,
        skip: query.offset || 0
      }),
      this.prisma.modifierTemplate.count({ where })
    ]);

    return {
      templates,
      pagination: {
        total,
        limit: query.limit || 50,
        offset: query.offset || 0,
        pages: Math.ceil(total / (query.limit || 50))
      }
    };
  }

  /**
   * Update modifier template
   */
  async updateModifierTemplate(
    templateId: string,
    data: UpdateModifierTemplateDTO,
    staffId: string
  ): Promise<ModifierTemplateWithOptions> {
    return await this.prisma.$transaction(async (tx) => {
      const template = await tx.modifierTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Modifier template not found');
      }

      // Check for duplicate name if updating name
      if (data.name && data.name !== template.name) {
        const existing = await tx.modifierTemplate.findFirst({
          where: {
            restaurantId: template.restaurantId,
            name: data.name,
            isActive: true,
            id: { not: templateId }
          }
        });

        if (existing) {
          throw new ApiError(409, 'DUPLICATE_NAME', 'A modifier template with this name already exists');
        }
      }

      // Update the template
      const updated = await tx.modifierTemplate.update({
        where: { id: templateId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.type && { type: data.type }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        },
        include: this.getTemplateIncludes()
      });

      return updated;
    });
  }

  /**
   * Delete modifier template (soft delete)
   */
  async deleteModifierTemplate(templateId: string, staffId: string): Promise<void> {
    return await this.prisma.$transaction(async (tx) => {
      const template = await tx.modifierTemplate.findUnique({
        where: { id: templateId },
        include: { menuItems: true }
      });

      if (!template) {
        throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Modifier template not found');
      }

      // Check if template is in use
      if (template.menuItems.length > 0) {
        throw new ApiError(400, 'TEMPLATE_IN_USE', 'Cannot delete template that is assigned to menu items');
      }

      // Soft delete the template
      await tx.modifierTemplate.update({
        where: { id: templateId },
        data: { isActive: false }
      });

      // Soft delete all options
      await tx.modifierOption.updateMany({
        where: { templateId },
        data: { isActive: false }
      });
    });
  }

  /**
   * Add option to template
   */
  async addOptionToTemplate(
    templateId: string,
    data: CreateModifierOptionDTO,
    staffId: string
  ): Promise<ModifierOption> {
    return await this.prisma.$transaction(async (tx) => {
      const template = await tx.modifierTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Modifier template not found');
      }

      // Check for duplicate option name within template
      const existing = await tx.modifierOption.findFirst({
        where: {
          templateId,
          name: data.name,
          isActive: true
        }
      });

      if (existing) {
        throw new ApiError(409, 'DUPLICATE_OPTION', 'An option with this name already exists in this template');
      }

      // Get max display order
      const maxOrder = await tx.modifierOption.aggregate({
        where: { templateId, isActive: true },
        _max: { displayOrder: true }
      });

      const option = await tx.modifierOption.create({
        data: {
          templateId,
          name: data.name,
          price: data.price,
          displayOrder: data.displayOrder ?? ((maxOrder._max.displayOrder || 0) + 1)
        }
      });

      return option;
    });
  }

  /**
   * Update template option
   */
  async updateTemplateOption(
    optionId: string,
    data: UpdateModifierOptionDTO,
    staffId: string
  ): Promise<ModifierOption> {
    return await this.prisma.$transaction(async (tx) => {
      const option = await tx.modifierOption.findUnique({
        where: { id: optionId },
        include: { template: true }
      });

      if (!option) {
        throw new ApiError(404, 'OPTION_NOT_FOUND', 'Modifier option not found');
      }

      // Check for duplicate name if updating name
      if (data.name && data.name !== option.name) {
        const existing = await tx.modifierOption.findFirst({
          where: {
            templateId: option.templateId,
            name: data.name,
            isActive: true,
            id: { not: optionId }
          }
        });

        if (existing) {
          throw new ApiError(409, 'DUPLICATE_OPTION', 'An option with this name already exists in this template');
        }
      }

      const updated = await tx.modifierOption.update({
        where: { id: optionId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.price !== undefined && { price: data.price }),
          ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
          ...(data.isActive !== undefined && { isActive: data.isActive })
        }
      });

      return updated;
    });
  }

  /**
   * Delete template option (soft delete)
   */
  async deleteTemplateOption(optionId: string, staffId: string): Promise<void> {
    const option = await this.prisma.modifierOption.findUnique({
      where: { id: optionId }
    });

    if (!option) {
      throw new ApiError(404, 'OPTION_NOT_FOUND', 'Modifier option not found');
    }

    // Soft delete
    await this.prisma.modifierOption.update({
      where: { id: optionId },
      data: { isActive: false }
    });
  }

  /**
   * Get template includes for queries
   */
  private getTemplateIncludes() {
    return {
      options: {
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' as const }
      },
      _count: {
        select: { menuItems: true }
      }
    };
  }
}