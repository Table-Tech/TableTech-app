import { FastifyRequest, FastifyReply } from "fastify";
import {
  CreateStaffSchema,
  UpdateStaffSchema,
  StaffIdParamSchema,
  GetStaffQuerySchema,
} from "../schemas/auth.schema";
import {
  createStaff,
  getStaffByRestaurant,
  getStaffById,
  updateStaff,
  deleteStaff,
} from "../services/staff.service";

export const createStaffHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = CreateStaffSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  try {
    const staff = await createStaff(result.data);
    return reply.code(201).send({
      message: "Staff member created successfully",
      staff
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return reply.status(400).send({ error: errorMessage });
  }
};

export const getStaffHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const query = req.query as any;
  
  // If no restaurantId provided, use the authenticated staff's restaurant
  const restaurantId = query.restaurantId || req.staff?.restaurantId;
  
  if (!restaurantId) {
    return reply.status(400).send({ error: "Restaurant ID required" });
  }

  try {
    const staff = await getStaffByRestaurant(restaurantId);
    return reply.send(staff);
  } catch (error) {
    return reply.status(500).send({ error: "Failed to fetch staff" });
  }
};

export const getStaffByIdHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = StaffIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid staff ID" });
  }

  try {
    const staff = await getStaffById(result.data.id);
    return reply.send(staff);
  } catch (error) {
    return reply.status(404).send({ error: "Staff member not found" });
  }
};

export const updateStaffHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const paramResult = StaffIdParamSchema.safeParse(req.params);
  if (!paramResult.success) {
    return reply.status(400).send({ error: "Invalid staff ID" });
  }

  const bodyResult = UpdateStaffSchema.safeParse(req.body);
  if (!bodyResult.success) {
    return reply.status(400).send({ error: "Invalid input", details: bodyResult.error });
  }

  try {
    const staff = await updateStaff(paramResult.data.id, bodyResult.data);
    return reply.send({
      message: "Staff member updated successfully",
      staff
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return reply.status(400).send({ error: errorMessage });
  }
};

export const deleteStaffHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = StaffIdParamSchema.safeParse(req.params);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid staff ID" });
  }

  try {
    await deleteStaff(result.data.id);
    return reply.status(204).send();
  } catch (error) {
    return reply.status(404).send({ error: "Staff member not found" });
  }
};