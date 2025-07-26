import { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { ApiError } from '../types/errors.js';
import { ModifierService } from '../services/modifier.service.js';
import {
  CreateModifierSchema,
  UpdateModifierSchema,
  ModifierQuerySchema,
  ModifierParamsSchema,
  ReorderModifiersSchema,
  BulkUpdateModifiersSchema,
  GetModifiersQuerySchema,
  ModifierIdParamSchema
} from '../schemas/modifier.schema.js';

export class ModifierController {
  private svc = new ModifierService();

  // =================== MODIFIER ENDPOINTS ===================

  /** POST /modifiers - Create modifier */
  async createModifier(
    req: AuthenticatedRequest<z.infer<typeof CreateModifierSchema>>,
    reply: FastifyReply
  ) {
    const modifier = await this.svc.createModifier(req.body, req.user.staffId);
    return reply.status(201).send({ 
      success: true, 
      message: 'Modifier created successfully',
      data: modifier 
    });
  }

  /** GET /modifiers - List modifiers with filters */
  async listModifiers(
    req: AuthenticatedRequest<unknown, unknown, z.infer<typeof ModifierQuerySchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.getModifiers(req.query);
    return reply.send({ 
      success: true, 
      data: result.modifiers,
      pagination: result.pagination
    });
  }

  /** GET /modifiers/:id - Get modifier details */
  async getModifierById(
    req: AuthenticatedRequest<unknown, z.infer<typeof ModifierParamsSchema>>,
    reply: FastifyReply
  ) {
    const modifier = await this.svc.findById(req.params.id);
    
    if (!modifier) {
      throw new ApiError(404, 'MODIFIER_NOT_FOUND', 'Modifier not found');
    }
    
    return reply.send({ success: true, data: modifier });
  }

  /** PATCH /modifiers/:id - Update modifier */
  async updateModifier(
    req: AuthenticatedRequest<
      z.infer<typeof UpdateModifierSchema>,
      z.infer<typeof ModifierParamsSchema>
    >,
    reply: FastifyReply
  ) {
    const modifier = await this.svc.updateModifier(
      req.params.id,
      req.body,
      req.user.staffId
    );
    return reply.send({ 
      success: true, 
      message: 'Modifier updated successfully',
      data: modifier 
    });
  }

  /** DELETE /modifiers/:id - Delete modifier */
  async deleteModifier(
    req: AuthenticatedRequest<unknown, z.infer<typeof ModifierParamsSchema>>,
    reply: FastifyReply
  ) {
    await this.svc.deleteModifier(req.params.id, req.user.staffId);
    return reply.send({ 
      success: true, 
      message: 'Modifier deleted successfully' 
    });
  }

  /** POST /modifiers/reorder - Reorder modifiers */
  async reorderModifiers(
    req: AuthenticatedRequest<z.infer<typeof ReorderModifiersSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.reorderModifiers(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Reordered ${result.updated} modifiers`
    });
  }

  /** PATCH /modifiers/bulk - Bulk update modifiers */
  async bulkUpdateModifiers(
    req: AuthenticatedRequest<z.infer<typeof BulkUpdateModifiersSchema>>,
    reply: FastifyReply
  ) {
    const result = await this.svc.bulkUpdateModifiers(req.body, req.user.staffId);
    return reply.send({ 
      success: true, 
      data: result,
      message: `Updated ${result.updated} modifiers`
    });
  }

  /** GET /modifiers/statistics - Get modifier statistics */
  async getModifierStatistics(
    req: AuthenticatedRequest<unknown, unknown, { modifierGroupId: string }>,
    reply: FastifyReply
  ) {
    if (!req.query.modifierGroupId) {
      throw new ApiError(400, 'MISSING_MODIFIER_GROUP_ID', 'Modifier group ID is required');
    }
    
    const stats = await this.svc.getModifierStatistics(req.query.modifierGroupId);
    return reply.send({ success: true, data: stats });
  }

  // =================== LEGACY ENDPOINTS (for backward compatibility) ===================

  /** GET /modifiers - Legacy endpoint */
  async getLegacyModifiers(
    req: FastifyRequest<{ Querystring: z.infer<typeof GetModifiersQuerySchema> }>,
    reply: FastifyReply
  ) {
    const modifiers = await this.svc.findByGroup(req.query.modifierGroupId);
    return reply.send(modifiers);
  }

  /** GET /modifiers/:id - Legacy get modifier endpoint */
  async getLegacyModifierById(
    req: FastifyRequest<{ Params: z.infer<typeof ModifierIdParamSchema> }>,
    reply: FastifyReply
  ) {
    const modifier = await this.svc.findById(req.params.id);
    
    if (!modifier) {
      throw new ApiError(404, 'MODIFIER_NOT_FOUND', 'Modifier not found');
    }
    
    return reply.send(modifier);
  }

  /** POST /modifiers - Legacy create endpoint */
  async createLegacyModifier(
    req: FastifyRequest<{ Body: z.infer<typeof CreateModifierSchema> }>,
    reply: FastifyReply
  ) {
    const modifier = await this.svc.createModifier(req.body, 'legacy-staff');
    return reply.status(201).send(modifier);
  }

  /** PUT /modifiers/:id - Legacy update endpoint */
  async updateLegacyModifier(
    req: FastifyRequest<{ 
      Body: z.infer<typeof UpdateModifierSchema>;
      Params: z.infer<typeof ModifierIdParamSchema>;
    }>,
    reply: FastifyReply
  ) {
    const modifier = await this.svc.updateModifier(
      req.params.id, 
      req.body, 
      'legacy-staff'
    );
    return reply.send(modifier);
  }

  /** DELETE /modifiers/:id - Legacy delete endpoint */
  async deleteLegacyModifier(
    req: FastifyRequest<{ Params: z.infer<typeof ModifierIdParamSchema> }>,
    reply: FastifyReply
  ) {
    await this.svc.deleteModifier(req.params.id, 'legacy-staff');
    return reply.status(204).send();
  }
}

// Legacy function exports (for backward compatibility - to be removed later)
export const createModifierHandler = async (
  req: FastifyRequest<{ Body: z.infer<typeof CreateModifierSchema> }>, 
  reply: FastifyReply
) => {
  const controller = new ModifierController();
  return await controller.createLegacyModifier(req, reply);
};

export const getModifiersHandler = async (
  req: FastifyRequest<{ Querystring: z.infer<typeof GetModifiersQuerySchema> }>, 
  reply: FastifyReply
) => {
  const controller = new ModifierController();
  return await controller.getLegacyModifiers(req, reply);
};

export const getModifierHandler = async (
  req: FastifyRequest<{ Params: z.infer<typeof ModifierIdParamSchema> }>,
  reply: FastifyReply
) => {
  const controller = new ModifierController();
  return await controller.getLegacyModifierById(req, reply);
};

export const updateModifierHandler = async (
  req: FastifyRequest<{ 
    Body: z.infer<typeof UpdateModifierSchema>;
    Params: z.infer<typeof ModifierIdParamSchema>;
  }>,
  reply: FastifyReply
) => {
  const controller = new ModifierController();
  return await controller.updateLegacyModifier(req, reply);
};

export const deleteModifierHandler = async (
  req: FastifyRequest<{ Params: z.infer<typeof ModifierIdParamSchema> }>,
  reply: FastifyReply
) => {
  const controller = new ModifierController();
  return await controller.deleteLegacyModifier(req, reply);
};