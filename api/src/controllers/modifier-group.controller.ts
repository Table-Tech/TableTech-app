import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateModifierGroupSchema,
  UpdateModifierGroupSchema,
  GetModifierGroupsQuerySchema,
  ModifierGroupIdParamSchema,
} from "../schemas/modifier-group.schema";
import {
  createModifierGroup,
  getModifierGroupsByMenuItem,
  getModifierGroupById,
  updateModifierGroup,
  deleteModifierGroup,
} from "../services/modifier-group.service";

export const createModifierGroupHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateModifierGroupSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  try {
    const modifierGroup = await createModifierGroup(result.data);
    return reply.code(201).send(modifierGroup);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return reply.status(500).send({ error: "Failed to create modifier group", details: errorMessage });
  }
};

export const getModifierGroupsHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = GetModifierGroupsQuerySchema.safeParse(req.query);
  if (!result.success) {
    return reply.status(400).send({ error: "Missing or invalid menuItemId" });
  }

  const modifierGroups = await getModifierGroupsByMenuItem(result.data.menuItemId);
  return reply.send(modifierGroups);
};

export const getModifierGroupHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = ModifierGroupIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid modifier group ID" });
  }

  const modifierGroup = await getModifierGroupById(result.data.id);
  if (!modifierGroup) {
    return reply.status(404).send({ error: "Modifier group not found" });
  }

  return reply.send(modifierGroup);
};

export const updateModifierGroupHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const paramResult = ModifierGroupIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return reply.status(400).send({ error: "Invalid modifier group ID" });
  }

  const bodyResult = UpdateModifierGroupSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return reply.status(400).send({ error: "Invalid input", details: bodyResult.error });
  }

  try {
    const modifierGroup = await updateModifierGroup(paramResult.data.id, bodyResult.data);
    return reply.send(modifierGroup);
  } catch (error) {
    return reply.status(404).send({ error: "Modifier group not found" });
  }
};

export const deleteModifierGroupHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = ModifierGroupIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid modifier group ID" });
  }

  try {
    await deleteModifierGroup(result.data.id);
    return reply.status(204).send(); // 204 No Content for successful deletion
  } catch (error) {
    return reply.status(404).send({ error: "Modifier group not found" });
  }
};