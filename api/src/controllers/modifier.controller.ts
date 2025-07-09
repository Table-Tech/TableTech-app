import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateModifierSchema,
  UpdateModifierSchema,
  GetModifiersQuerySchema,
  ModifierIdParamSchema,
} from "../schemas/modifier.schema";
import {
  createModifier,
  getModifiersByGroup,
  getModifierById,
  updateModifier,
  deleteModifier,
} from "../services/modifier.service";

export const createModifierHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateModifierSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  try {
    const modifier = await createModifier(result.data);
    return reply.code(201).send(modifier);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return reply.status(500).send({ error: "Failed to create modifier", details: errorMessage });
  }
};

export const getModifiersHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = GetModifiersQuerySchema.safeParse(req.query);
  if (!result.success) {
    return reply.status(400).send({ error: "Missing or invalid modifierGroupId" });
  }

  const modifiers = await getModifiersByGroup(result.data.modifierGroupId);
  return reply.send(modifiers);
};

export const getModifierHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = ModifierIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid modifier ID" });
  }

  const modifier = await getModifierById(result.data.id);
  if (!modifier) {
    return reply.status(404).send({ error: "Modifier not found" });
  }

  return reply.send(modifier);
};

export const updateModifierHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const paramResult = ModifierIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return reply.status(400).send({ error: "Invalid modifier ID" });
  }

  const bodyResult = UpdateModifierSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return reply.status(400).send({ error: "Invalid input", details: bodyResult.error });
  }

  try {
    const modifier = await updateModifier(paramResult.data.id, bodyResult.data);
    return reply.send(modifier);
  } catch (error) {
    return reply.status(404).send({ error: "Modifier not found" });
  }
};

export const deleteModifierHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = ModifierIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid modifier ID" });
  }

  try {
    await deleteModifier(result.data.id);
    return reply.status(204).send(); // 204 No Content for successful deletion
  } catch (error) {
    return reply.status(404).send({ error: "Modifier not found" });
  }
};