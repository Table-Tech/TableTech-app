import { FastifyReply } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest, getRestaurantId } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { ModifierTemplateService } from '../services/modifier-template.service.js';
import { MenuItemModifierService } from '../services/menu-item-modifier.service.js';

// Validation schemas
const CreateModifierTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
  options: z.array(z.object({
    name: z.string().min(1, 'Option name is required').max(100, 'Option name too long'),
    price: z.number().min(0, 'Price cannot be negative'),
    displayOrder: z.number().int().min(0).optional()
  })).min(1, 'At least one option is required')
});

const UpdateModifierTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']).optional(),
  isActive: z.boolean().optional()
});

const CreateModifierOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(100, 'Option name too long'),
  price: z.number().min(0, 'Price cannot be negative'),
  displayOrder: z.number().int().min(0).optional()
});

const UpdateModifierOptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  price: z.number().min(0).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

const ModifierTemplateQuerySchema = z.object({
  search: z.string().optional(),
  isActive: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  offset: z.number().int().min(0).optional()
});

const AssignTemplateSchema = z.object({
  templateId: z.string().uuid(),
  displayName: z.string().max(100).optional(),
  required: z.boolean().optional(),
  minSelect: z.number().int().min(0).optional(),
  maxSelect: z.number().int().min(1).optional(),
  displayOrder: z.number().int().min(0).optional(),
  optionOverrides: z.array(z.object({
    optionId: z.string().uuid(),
    isHidden: z.boolean().optional(),
    priceOverride: z.number().min(0).optional(),
    nameOverride: z.string().max(100).optional(),
    isDefault: z.boolean().optional()
  })).optional()
});

export class ModifierTemplateController {
  private templateService = new ModifierTemplateService();
  private menuItemService = new MenuItemModifierService();

  // =================== TEMPLATE MANAGEMENT ===================

  /** POST /modifier-templates - Create modifier template */
  async createTemplate(
    req: AuthenticatedRequest<z.infer<typeof CreateModifierTemplateSchema>>,
    reply: FastifyReply
  ) {
    const restaurantId = getRestaurantId(req);
    
    const template = await this.templateService.createModifierTemplate(
      { ...req.body, restaurantId },
      req.user.staffId
    );
    
    return reply.status(201).send({
      success: true,
      message: 'Modifier template created successfully',
      data: template
    });
  }

  /** GET /modifier-templates - List modifier templates */
  async listTemplates(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof ModifierTemplateQuerySchema>>,
    reply: FastifyReply
  ) {
    const restaurantId = getRestaurantId(req);
    
    const result = await this.templateService.getModifierTemplates({
      ...req.query,
      restaurantId
    });
    
    return reply.send({
      success: true,
      data: result.templates,
      pagination: result.pagination
    });
  }

  /** GET /modifier-templates/:id - Get template details */
  async getTemplate(
    req: AuthenticatedRequest<unknown, { id: string }>,
    reply: FastifyReply
  ) {
    const template = await this.templateService.findById(req.params.id);
    
    if (!template) {
      throw new ApiError(404, 'TEMPLATE_NOT_FOUND', 'Modifier template not found');
    }
    
    // Verify restaurant access
    const restaurantId = getRestaurantId(req);
    if (template.restaurantId !== restaurantId) {
      throw new ApiError(403, 'FORBIDDEN', 'Access denied');
    }
    
    return reply.send({ success: true, data: template });
  }

  /** PATCH /modifier-templates/:id - Update template */
  async updateTemplate(
    req: AuthenticatedRequest<z.infer<typeof UpdateModifierTemplateSchema>, { id: string }>,
    reply: FastifyReply
  ) {
    const template = await this.templateService.updateModifierTemplate(
      req.params.id,
      req.body,
      req.user.staffId
    );
    
    return reply.send({
      success: true,
      message: 'Template updated successfully',
      data: template
    });
  }

  /** DELETE /modifier-templates/:id - Delete template */
  async deleteTemplate(
    req: AuthenticatedRequest<unknown, { id: string }>,
    reply: FastifyReply
  ) {
    await this.templateService.deleteModifierTemplate(req.params.id, req.user.staffId);
    
    return reply.send({
      success: true,
      message: 'Template deleted successfully'
    });
  }

  // =================== TEMPLATE OPTIONS ===================

  /** POST /modifier-templates/:id/options - Add option to template */
  async addOption(
    req: AuthenticatedRequest<z.infer<typeof CreateModifierOptionSchema>, { id: string }>,
    reply: FastifyReply
  ) {
    const option = await this.templateService.addOptionToTemplate(
      req.params.id,
      { ...req.body, templateId: req.params.id },
      req.user.staffId
    );
    
    return reply.status(201).send({
      success: true,
      message: 'Option added successfully',
      data: option
    });
  }

  /** PATCH /modifier-templates/:templateId/options/:optionId - Update option */
  async updateOption(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateModifierOptionSchema>,
      { templateId: string; optionId: string }
    >,
    reply: FastifyReply
  ) {
    const option = await this.templateService.updateTemplateOption(
      req.params.optionId,
      req.body,
      req.user.staffId
    );
    
    return reply.send({
      success: true,
      message: 'Option updated successfully',
      data: option
    });
  }

  /** DELETE /modifier-templates/:templateId/options/:optionId - Delete option */
  async deleteOption(
    req: AuthenticatedRequest<unknown, { templateId: string; optionId: string }>,
    reply: FastifyReply
  ) {
    await this.templateService.deleteTemplateOption(req.params.optionId, req.user.staffId);
    
    return reply.send({
      success: true,
      message: 'Option deleted successfully'
    });
  }

  // =================== MENU ITEM ASSIGNMENTS ===================

  /** POST /menu-items/:menuItemId/templates - Assign template to menu item */
  async assignTemplate(
    req: AuthenticatedRequest<z.infer<typeof AssignTemplateSchema>, { menuItemId: string }>,
    reply: FastifyReply
  ) {
    const assignment = await this.menuItemService.assignTemplateToMenuItem(
      { ...req.body, menuItemId: req.params.menuItemId },
      req.user.staffId
    );
    
    return reply.status(201).send({
      success: true,
      message: 'Template assigned successfully',
      data: assignment
    });
  }

  /** GET /menu-items/:menuItemId/templates - Get menu item modifiers */
  async getMenuItemTemplates(
    req: AuthenticatedRequest<unknown, { menuItemId: string }>,
    reply: FastifyReply
  ) {
    const modifiers = await this.menuItemService.getMenuItemModifiers(req.params.menuItemId);
    
    return reply.send({
      success: true,
      data: modifiers
    });
  }

  /** DELETE /menu-items/:menuItemId/templates/:templateId - Unassign template */
  async unassignTemplate(
    req: AuthenticatedRequest<unknown, { menuItemId: string; templateId: string }>,
    reply: FastifyReply
  ) {
    await this.menuItemService.unassignTemplateFromMenuItem(
      req.params.menuItemId,
      req.params.templateId,
      req.user.staffId
    );
    
    return reply.send({
      success: true,
      message: 'Template unassigned successfully'
    });
  }

  /** GET /menu-items/:menuItemId/modifiers/resolved - Get customer-facing modifiers */
  async getResolvedModifiers(
    req: AuthenticatedRequest<unknown, { menuItemId: string }>,
    reply: FastifyReply
  ) {
    const modifiers = await this.menuItemService.getResolvedModifiersForOrder(req.params.menuItemId);
    
    return reply.send({
      success: true,
      data: modifiers
    });
  }
}