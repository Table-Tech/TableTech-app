import { FastifyRequest, FastifyReply } from "fastify";
import { LoginSchema } from "../schemas/auth.schema";
import { loginStaff, getStaffFromToken } from "../services/auth.service";

export const loginHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return reply.status(400).send({ error: "Invalid input", details: result.error });
  }

  try {
    const authResult = await loginStaff(result.data);
    return reply.send({
      message: "Login successful",
      ...authResult
    });
  } catch (error) {
    const errorMessage = (error instanceof Error) ? error.message : "Unauthorized";
    return reply.status(401).send({ error: errorMessage });
  }
};

export const getMeHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    if (!req.staff) {
      return reply.status(401).send({ error: "Authentication required" });
    }

    const staff = await getStaffFromToken(req.staff.staffId);
    return reply.send(staff);
  } catch (error) {
    return reply.status(401).send({ error: "Invalid token" });
  }
};

export const logoutHandler = async (req: FastifyRequest, reply: FastifyReply) => {
  // Since JWT is stateless, logout is handled client-side by removing token
  // But we can add token blacklisting here if needed in the future
  return reply.send({ message: "Logout successful" });
};