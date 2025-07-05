import { PrismaClient } from "@prisma/client";
import { hashPassword, validatePassword } from "../utils/password";

const prisma = new PrismaClient();

type StaffRole = "ADMIN" | "MANAGER" | "CHEF" | "WAITER" | "CASHIER";

type CreateStaffInput = {
  name: string;
  email: string;
  password: string;
  role: StaffRole;
  restaurantId: string;
};

type UpdateStaffInput = {
  name?: string;
  email?: string;
  password?: string;
  role?: StaffRole;
  isActive?: boolean;
};

export const createStaff = async (data: CreateStaffInput) => {
  // Validate password strength
  const passwordValidation = validatePassword(data.password);
  if (!passwordValidation.valid) {
    throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
  }

  // Check if email already exists
  const existingStaff = await prisma.staff.findUnique({
    where: { email: data.email }
  });

  if (existingStaff) {
    throw new Error("Email already exists");
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create staff member
  const staff = await prisma.staff.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      restaurant: {
        connect: { id: data.restaurantId }
      }
    },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  });

  // Return staff without password hash
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    isActive: staff.isActive,
    createdAt: staff.createdAt,
    restaurant: staff.restaurant
  };
};

export const getStaffByRestaurant = async (restaurantId: string) => {
  return prisma.staff.findMany({
    where: { restaurantId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true
    },
    orderBy: { createdAt: "desc" }
  });
};

export const getStaffById = async (id: string) => {
  const staff = await prisma.staff.findUnique({
    where: { id },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  });

  if (!staff) {
    throw new Error("Staff member not found");
  }

  // Return staff without password hash
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    isActive: staff.isActive,
    createdAt: staff.createdAt,
    updatedAt: staff.updatedAt,
    restaurant: staff.restaurant
  };
};

export const updateStaff = async (id: string, data: UpdateStaffInput) => {
  const updateData: any = {};

  if (data.name) updateData.name = data.name;
  if (data.email) updateData.email = data.email;
  if (data.role) updateData.role = data.role;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  // Handle password update
  if (data.password) {
    const passwordValidation = validatePassword(data.password);
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }
    updateData.passwordHash = await hashPassword(data.password);
  }

  const staff = await prisma.staff.update({
    where: { id },
    data: updateData,
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  });

  // Return staff without password hash
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role,
    isActive: staff.isActive,
    updatedAt: staff.updatedAt,
    restaurant: staff.restaurant
  };
};

export const deleteStaff = async (id: string) => {
  return prisma.staff.delete({
    where: { id }
  });
};