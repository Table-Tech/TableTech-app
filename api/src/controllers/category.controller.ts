import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  GetCategoriesQuerySchema,
  CategoryIdParamSchema,
} from "../schemas/category.schema";
import {
  createCategory,
  getCategoriesByRestaurant,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../services/category.service";

export const createCategoryHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateCategorySchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  const category = await createCategory(result.data);
  return reply.code(201).send(category);
};

export const getCategoriesHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = GetCategoriesQuerySchema.safeParse(req.query);
  if (!result.success) {
    return reply.status(400).send({ error: "Missing or invalid restaurantId" });
  }

  const categories = await getCategoriesByRestaurant(result.data.restaurantId);
  return reply.send(categories);
};

export const getCategoryHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CategoryIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid category ID" });
  }

  const category = await getCategoryById(result.data.id);
  if (!category) {
    return reply.status(404).send({ error: "Category not found" });
  }

  return reply.send(category);
};

export const updateCategoryHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const paramResult = CategoryIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return reply.status(400).send({ error: "Invalid category ID" });
  }

  const bodyResult = UpdateCategorySchema.safeParse(req.body);
  if (!bodyResult.success) {
    return reply.status(400).send({ error: "Invalid input", details: bodyResult.error });
  }

  const category = await updateCategory(paramResult.data.id, bodyResult.data);
  return reply.send(category);
};

export const deleteCategoryHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CategoryIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid category ID" });
  }

  await deleteCategory(result.data.id);
  return reply.status(204).send(); // 204 No Content for successful deletion
};