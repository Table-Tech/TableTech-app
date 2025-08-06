import { MenuItemModifierGroup, MenuItemModifierOption, Prisma } from '@prisma/client';
import { BaseService } from './base.service.js';
import { ApiError } from '../types/errors.js';

// Helper function to convert Prisma Decimal to number
const convertDecimalToNumber = (decimal: any): number => {
  return typeof decimal === 'number' ? decimal : Number(decimal);
};

// Transform Prisma result to expected type
const transformAssignmentResult = (data: any): MenuItemModifierGroupWithDetails => {
  return {
    ...data,
    template: {
      ...data.template,
      options: data.template.options.map((option: any) => ({
        ...option,
        price: convertDecimalToNumber(option.price)
      }))
    },
    optionOverrides: data.optionOverrides?.map((override: any) => ({
      ...override,
      priceOverride: override.priceOverride ? convertDecimalToNumber(override.priceOverride) : null
    })) || []
  };
};

// DTOs for menu item modifier assignments
export interface AssignTemplateToMenuItemDTO {
  menuItemId: string;
  templateId: string;
  displayName?: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  displayOrder?: number;
  optionOverrides?: Array<{
    optionId: string;
    isHidden?: boolean;
    priceOverride?: number;
    nameOverride?: string;
    isDefault?: boolean;
  }>;
}

export interface UpdateMenuItemModifierGroupDTO {
  displayName?: string;
  required?: boolean;
  minSelect?: number;
  maxSelect?: number;
  displayOrder?: number;
}

export interface CreateOptionOverrideDTO {
  groupId: string;
  optionId: string;
  isHidden?: boolean;
  priceOverride?: number;
  nameOverride?: string;
  isDefault?: boolean;
}

type MenuItemModifierGroupWithDetails = MenuItemModifierGroup & {
  template: {
    id: string;
    name: string;
    type: string;
    options: Array<{
      id: string;
      name: string;
      price: number;
      displayOrder: number;
    }>;
  };
  optionOverrides: Array<{
    id: string;
    optionId: string;
    isHidden: boolean;
    priceOverride: number | null;
    nameOverride: string | null;
    isDefault: boolean;
  }>;
};

export class MenuItemModifierService extends BaseService<Prisma.MenuItemModifierGroupCreateInput, MenuItemModifierGroup> {
  protected model = 'menuItemModifierGroup' as const;

  /**
   * Assign modifier template to menu item with optional overrides
   */
  async assignTemplateToMenuItem(data: AssignTemplateToMenuItemDTO, staffId: string): Promise<MenuItemModifierGroupWithDetails> {
    return await this.prisma.$transaction(async (tx) => {
      // Verify menu item exists
      const menuItem = await tx.menuItem.findUnique({
        where: { id: data.menuItemId },
        select: { id: true, restaurantId: true }
      });

      if (!menuItem) {
        throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
      }

      // Verify template exists and belongs to same restaurant
      const template = await tx.modifierTemplate.findUnique({
        where: { id: data.templateId },
        include: { options: { where: { isActive: true } } }
      });

      if (!template) {
        throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Modifier template not found');
      }

      if (template.restaurantId !== menuItem.restaurantId) {
        throw new ApiError(400, 'RESTAURANT_MISMATCH', 'Template and menu item must belong to the same restaurant');
      }

      // Check if already assigned
      const existing = await tx.menuItemModifierGroup.findUnique({
        where: {
          menuItemId_templateId: {
            menuItemId: data.menuItemId,
            templateId: data.templateId
          }
        }
      });

      if (existing) {
        throw new ApiError(409, 'ALREADY_ASSIGNED', 'This template is already assigned to this menu item');
      }

      // Get max display order for this menu item
      const maxOrder = await tx.menuItemModifierGroup.aggregate({
        where: { menuItemId: data.menuItemId },
        _max: { displayOrder: true }
      });

      // Create the assignment
      const assignment = await tx.menuItemModifierGroup.create({
        data: {
          menuItemId: data.menuItemId,
          templateId: data.templateId,
          displayName: data.displayName,
          required: data.required ?? false,
          minSelect: data.minSelect ?? 0,
          maxSelect: data.maxSelect,
          displayOrder: data.displayOrder ?? ((maxOrder._max.displayOrder || 0) + 1)
        },
        include: this.getAssignmentIncludes()
      });

      // Create option overrides if provided
      if (data.optionOverrides && data.optionOverrides.length > 0) {
        const overrideData = data.optionOverrides.map(override => ({
          groupId: assignment.id,
          optionId: override.optionId,
          isHidden: override.isHidden ?? false,
          priceOverride: override.priceOverride,
          nameOverride: override.nameOverride,
          isDefault: override.isDefault ?? false
        }));

        await tx.menuItemModifierOption.createMany({
          data: overrideData
        });
      }

      // Return assignment with all details
      const result = await tx.menuItemModifierGroup.findUniqueOrThrow({
        where: { id: assignment.id },
        include: this.getAssignmentIncludes()
      });
      
      return transformAssignmentResult(result);
    });
  }

  /**
   * Get modifier assignments for a menu item
   */
  async getMenuItemModifiers(menuItemId: string): Promise<MenuItemModifierGroupWithDetails[]> {
    // Verify menu item exists
    const menuItem = await this.prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true }
    });

    if (!menuItem) {
      throw new ApiError(404, 'MENU_ITEM_NOT_FOUND', 'Menu item not found');
    }

    const results = await this.prisma.menuItemModifierGroup.findMany({
      where: { menuItemId },
      include: this.getAssignmentIncludes(),
      orderBy: { displayOrder: 'asc' }
    });
    
    return results.map(transformAssignmentResult);
  }

  /**
   * Update menu item modifier group settings
   */
  async updateMenuItemModifierGroup(
    groupId: string,
    data: UpdateMenuItemModifierGroupDTO,
    staffId: string
  ): Promise<MenuItemModifierGroupWithDetails> {
    const group = await this.prisma.menuItemModifierGroup.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      throw new ApiError(404, 'GROUP_NOT_FOUND', 'Menu item modifier group not found');
    }

    const updated = await this.prisma.menuItemModifierGroup.update({
      where: { id: groupId },
      data: {
        ...(data.displayName !== undefined && { displayName: data.displayName }),
        ...(data.required !== undefined && { required: data.required }),
        ...(data.minSelect !== undefined && { minSelect: data.minSelect }),
        ...(data.maxSelect !== undefined && { maxSelect: data.maxSelect }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder })
      },
      include: this.getAssignmentIncludes()
    });

    return transformAssignmentResult(updated);
  }

  /**
   * Remove template assignment from menu item
   */
  async unassignTemplateFromMenuItem(
    menuItemId: string,
    templateId: string,
    staffId: string
  ): Promise<void> {
    const assignment = await this.prisma.menuItemModifierGroup.findUnique({
      where: {
        menuItemId_templateId: {
          menuItemId,
          templateId
        }
      }
    });

    if (!assignment) {
      throw new ApiError(404, 'ASSIGNMENT_NOT_FOUND', 'This template is not assigned to this menu item');
    }

    // Delete assignment (cascades to option overrides)
    await this.prisma.menuItemModifierGroup.delete({
      where: { id: assignment.id }
    });
  }

  /**
   * Create or update option override
   */
  async upsertOptionOverride(data: CreateOptionOverrideDTO, staffId: string): Promise<MenuItemModifierOption> {
    return await this.prisma.$transaction(async (tx) => {
      // Verify the group and option exist
      const group = await tx.menuItemModifierGroup.findUnique({
        where: { id: data.groupId },
        include: { template: { include: { options: true } } }
      });

      if (!group) {
        throw new ApiError(404, 'GROUP_NOT_FOUND', 'Menu item modifier group not found');
      }

      const optionExists = group.template.options.some(option => option.id === data.optionId);
      if (!optionExists) {
        throw new ApiError(404, 'OPTION_NOT_FOUND', 'Option not found in template');
      }

      // Upsert the override
      const override = await tx.menuItemModifierOption.upsert({
        where: {
          groupId_optionId: {
            groupId: data.groupId,
            optionId: data.optionId
          }
        },
        create: {
          groupId: data.groupId,
          optionId: data.optionId,
          isHidden: data.isHidden ?? false,
          priceOverride: data.priceOverride,
          nameOverride: data.nameOverride,
          isDefault: data.isDefault ?? false
        },
        update: {
          ...(data.isHidden !== undefined && { isHidden: data.isHidden }),
          ...(data.priceOverride !== undefined && { priceOverride: data.priceOverride }),
          ...(data.nameOverride !== undefined && { nameOverride: data.nameOverride }),
          ...(data.isDefault !== undefined && { isDefault: data.isDefault })
        }
      });

      return override;
    });
  }

  /**
   * Remove option override
   */
  async removeOptionOverride(groupId: string, optionId: string, staffId: string): Promise<void> {
    const override = await this.prisma.menuItemModifierOption.findUnique({
      where: {
        groupId_optionId: {
          groupId,
          optionId
        }
      }
    });

    if (!override) {
      throw new ApiError(404, 'OVERRIDE_NOT_FOUND', 'Option override not found');
    }

    await this.prisma.menuItemModifierOption.delete({
      where: { id: override.id }
    });
  }

  /**
   * Get resolved modifiers for customer ordering
   * This returns the final modifier structure that customers see,
   * with all overrides applied
   */
  async getResolvedModifiersForOrder(menuItemId: string) {
    const assignments = await this.prisma.menuItemModifierGroup.findMany({
      where: { menuItemId },
      include: {
        template: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { displayOrder: 'asc' }
            }
          }
        },
        optionOverrides: true
      },
      orderBy: { displayOrder: 'asc' }
    });

    return assignments.map(assignment => {
      // Apply overrides to options
      const resolvedOptions = assignment.template.options
        .map(option => {
          const override = assignment.optionOverrides.find(o => o.optionId === option.id);
          
          // Skip hidden options
          if (override?.isHidden) {
            return null;
          }

          return {
            id: option.id,
            name: override?.nameOverride || option.name,
            price: override?.priceOverride !== null && override?.priceOverride !== undefined ? convertDecimalToNumber(override.priceOverride) : convertDecimalToNumber(option.price),
            displayOrder: option.displayOrder,
            isDefault: override?.isDefault || false
          };
        })
        .filter(option => option !== null); // Remove hidden options

      return {
        id: assignment.id,
        name: assignment.displayName || assignment.template.name,
        type: assignment.template.type,
        required: assignment.required,
        minSelect: assignment.minSelect,
        maxSelect: assignment.maxSelect,
        displayOrder: assignment.displayOrder,
        options: resolvedOptions
      };
    });
  }

  /**
   * Get assignment includes for queries
   */
  private getAssignmentIncludes() {
    return {
      template: {
        select: {
          id: true,
          name: true,
          type: true,
          options: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              price: true,
              displayOrder: true
            },
            orderBy: { displayOrder: 'asc' as const }
          }
        }
      },
      optionOverrides: {
        select: {
          id: true,
          optionId: true,
          isHidden: true,
          priceOverride: true,
          nameOverride: true,
          isDefault: true
        }
      }
    };
  }
}