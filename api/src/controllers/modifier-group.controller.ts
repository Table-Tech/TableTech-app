import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { ModifierGroupService } from '../services/modifier-group.service.js';
import {
  CreateModifierGroupSchema,
  UpdateModifierGroupSchema,
  ModifierGroupQuerySchema,
  ModifierGroupParamsSchema,
  ReorderModifierGroupsSchema,
  BulkUpdateModifierGroupsSchema,
  GetModifierGroupsQuerySchema,
  ModifierGroupIdParamSchema
} from '../schemas/modifier-group.schema.js';

export class ModifierGroupController {
  private svc = new ModifierGroupService();

  // =================== MODIFIER GROUP ENDPOINTS ===================

  /** POST /modifier-groups - Create modifier group */
  async createModifierGroup(
    req: AuthenticatedRequest<z.infer<typeof CreateModifierGroupSchema>>,
    reply: FastifyReply
  ) {
    const modifierGroup = await this.svc.createModifierGroup(req.body, req.user.staffId);
    return reply.status(201).send({ 
      success: true, 
      message: 'Modifier group created successfully',
      data: modifierGroup 
    });
  }

  /** GET /modifier-groups - List modifier groups with filters */
  async listModifierGroups(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof ModifierGroupQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.getModifierGroups(req.query);
    return reply.send({ 
      success: true, 
      data: result.modifierGroups,
      pagination: result.pagination
    });
  }

  /** GET /modifier-groups/:id - Get modifier group details */
  async getModifierGroupById(
    req: AuthenticatedRequest<unknown, z.infer<typeof ModifierGroupParamsSchema>>,
    reply: FastifyReply
  ) {
    const modifierGroup = await this.svc.findById(req.params.id);
    
    if (!modifierGroup) {
      throw new ApiError(404, 'MODIFIER_GROUP_NOT_FOUND', 'Modifier group not found');
    }
    
    return reply.send({ success: true, data: modifierGroup });
  }

  /** PATCH /modifier-groups/:id - Update modifier group */
  async updateModifierGroup(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateModifierGroupSchema>,
      z.infer<typeof ModifierGroupParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const modifierGroup = await this.svc.updateModifierGroup(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ 
      success: true, 
      message: 'Modifier group updated successfully',
      data: modifierGroup 
    });
  }

  /** DELETE /modifier-groups/:id - Delete modifier group */
  async deleteModifierGroup(
    req: AuthenticatedRequest<unknown, z.infer<typeof ModifierGroupParamsSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.deleteModifierGroup(req.params.id, req.user.staffId);
    return reply.send({ 
      success: true, 
      message: 'Modifier group deleted successfully' 
    });
  }

  /** POST /modifier-groups/reorder - Reorder modifier groups */
  async reorderModifierGroups(
    req: AuthenticatedRequest<z.infer<typeof ReorderModifierGroupsSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.reorderModifierGroups(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Reordered ${result.updated} modifier groups`
    });
  }

  /** PATCH /modifier-groups/bulk - Bulk update modifier groups */
  async bulkUpdateModifierGroups(
    req: AuthenticatedRequest<z.infer<typeof BulkUpdateModifierGroupsSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.bulkUpdateModifierGroups(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Updated ${result.updated} modifier groups`
    });
  }

  /** GET /modifier-groups/statistics - Get modifier group statistics */
  async getModifierGroupStatistics(
    req: AuthenticatedRequest<unknown, unknown, { menuItemId: string }>,
    reply: FastifyReply
  ) {
    if (!req.query.menuItemId) {
      throw new ApiError(400, 'MISSING_MENU_ITEM_ID', 'Menu item ID is required');
    }
    
    const stats = await this.svc.getModifierGroupStatistics(req.query.menuItemId);
    return reply.send({ success: true, data: stats });
  }

  // =================== LEGACY ENDPOINTS (for backward compatibility) ===================

  /** GET /modifier-groups - Legacy endpoint */
  async getLegacyModifierGroups(
    req: FastifyRequest<{ Querystring: z.infer<typeof GetModifierGroupsQuerySchema> }>,
    reply: FastifyReply
  ) {
    const modifierGroups = await this.svc.findByMenuItem(req.query.menuItemId);
    return reply.send(modifierGroups);
  }

  /** GET /modifier-groups/:id - Legacy get modifier group endpoint */
  async getLegacyModifierGroupById(
    req: FastifyRequest<{ Params: z.infer<typeof ModifierGroupIdParamSchema> }>,
    reply: FastifyReply
  ) {
    const modifierGroup = await this.svc.findById(req.params.id);
    
    if (!modifierGroup) {
      throw new ApiError(404, 'MODIFIER_GROUP_NOT_FOUND', 'Modifier group not found');
    }
    
    return reply.send(modifierGroup);
  }

  /** POST /modifier-groups - Legacy create endpoint */
  async createLegacyModifierGroup(
    req: FastifyRequest<{ Body: z.infer<typeof CreateModifierGroupSchema> }>,
    reply: FastifyReply
  ) {
    const modifierGroup = await this.svc.createModifierGroup(req.body, 'legacy-staff');
    return reply.status(201).send(modifierGroup);
  }

  /** PUT /modifier-groups/:id - Legacy update endpoint */
  async updateLegacyModifierGroup(
    req: FastifyRequest<{ 
      Body: z.infer<typeof UpdateModifierGroupSchema>;
      Params: z.infer<typeof ModifierGroupIdParamSchema>;
    }>,
    reply: FastifyReply
  ) {
    const modifierGroup = await this.svc.updateModifierGroup(
      req.params.id, 
      req.body, 
      'legacy-staff'
    );
    return reply.send(modifierGroup);
  }

  /** DELETE /modifier-groups/:id - Legacy delete endpoint */
  async deleteLegacyModifierGroup(
    req: FastifyRequest<{ Params: z.infer<typeof ModifierGroupIdParamSchema> }>,
    reply: FastifyReply
  ) {
    await this.svc.deleteModifierGroup(req.params.id, 'legacy-staff');
    return reply.status(204).send();
  }
}

// Legacy function exports (for backward compatibility - to be removed later)
export const createModifierGroupHandler = async (
  req: FastifyRequest<{ Body: z.infer<typeof CreateModifierGroupSchema> }>, 
  reply: FastifyReply
) => {
  const controller = new ModifierGroupController();
  return await controller.createLegacyModifierGroup(req, reply);
};

export const getModifierGroupsHandler = async (
  req: FastifyRequest<{ Querystring: z.infer<typeof GetModifierGroupsQuerySchema> }>, 
  reply: FastifyReply
) => {
  const controller = new ModifierGroupController();
  return await controller.getLegacyModifierGroups(req, reply);
};

export const getModifierGroupHandler = async (
  req: FastifyRequest<{ Params: z.infer<typeof ModifierGroupIdParamSchema> }>,
  reply: FastifyReply
) => {
  const controller = new ModifierGroupController();
  return await controller.getLegacyModifierGroupById(req, reply);
};

export const updateModifierGroupHandler = async (
  req: FastifyRequest<{ 
    Body: z.infer<typeof UpdateModifierGroupSchema>;
    Params: z.infer<typeof ModifierGroupIdParamSchema>;
  }>,
  reply: FastifyReply
) => {
  const controller = new ModifierGroupController();
  return await controller.updateLegacyModifierGroup(req, reply);
};

export const deleteModifierGroupHandler = async (
  req: FastifyRequest<{ Params: z.infer<typeof ModifierGroupIdParamSchema> }>,
  reply: FastifyReply
) => {
  const controller = new ModifierGroupController();
  return await controller.deleteLegacyModifierGroup(req, reply);
};