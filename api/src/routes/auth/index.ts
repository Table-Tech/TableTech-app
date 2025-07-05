import { FastifyInstance } from "fastify";
import { loginHandler, getMeHandler, logoutHandler } from "../../controllers/auth.controller";
import { authenticateStaff } from "../../middleware/auth.middleware";
import { CreateStaffSchema } from "../../schemas/auth.schema";        // NEW
import { createStaff } from "../../services/staff.service";            // NEW

export default async function authRoutes(server: FastifyInstance) {
  // POST /api/auth/login - Staff login
  server.post("/login", loginHandler);
  
  // POST /api/auth/logout - Staff logout
  server.post("/logout", logoutHandler);
  
  // GET /api/auth/me - Get current staff info (requires authentication)
  server.get("/me", {
    preHandler: [authenticateStaff]
  }, getMeHandler);

  // POST /api/auth/create-first-admin - Create first admin (no auth required)
  server.post("/create-first-admin", async (request, reply) => {
    const result = CreateStaffSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: "Invalid input", details: result.error });
    }

    try {
      const staff = await createStaff(result.data);
      return reply.code(201).send({
        message: "First admin created successfully",
        staff
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      return reply.status(400).send({ error: errorMessage });
    }
  });
}