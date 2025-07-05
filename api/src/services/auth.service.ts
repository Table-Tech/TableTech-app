import { PrismaClient } from "@prisma/client";
import { comparePassword } from "../utils/password";
import { generateToken, JWTPayload } from "../utils/jwt";

const prisma = new PrismaClient();

type LoginInput = {
  email: string;
  password: string;
};

export const loginStaff = async (data: LoginInput) => {
  // Find staff member by email
  const staff = await prisma.staff.findUnique({
    where: { email: data.email },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  });

  if (!staff) {
    throw new Error("Invalid email or password");
  }

  if (!staff.isActive) {
    throw new Error("Account is deactivated");
  }

  // Check password
  const isPasswordValid = await comparePassword(data.password, staff.passwordHash);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }

  // Generate JWT token
  const tokenPayload: JWTPayload = {
    staffId: staff.id,
    restaurantId: staff.restaurantId,
    role: staff.role,
    email: staff.email
  };

  const token = generateToken(tokenPayload);

  return {
    token,
    staff: {
      id: staff.id,
      name: staff.name,
      email: staff.email,
      role: staff.role,
      restaurant: staff.restaurant
    }
  };
};

export const getStaffFromToken = async (staffId: string) => {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  });

  if (!staff || !staff.isActive) {
    throw new Error("Staff member not found or inactive");
  }

  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    restaurant: staff.restaurant
  };
};