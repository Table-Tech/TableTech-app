import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// Define the input type ourselves instead of using Prisma.RestaurantCreateInput
type CreateRestaurantInput = {
  name: string;
  email?: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
};

export const createRestaurant = async (data: CreateRestaurantInput) => {
  return prisma.restaurant.create({ data });
};

export const getRestaurantById = async (id: string) => {
  return prisma.restaurant.findUnique({ where: { id } });
};

export const getAllRestaurants = async () => {
  return prisma.restaurant.findMany();
};