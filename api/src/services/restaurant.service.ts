import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export const createRestaurant = async (data: Prisma.RestaurantCreateInput) => {
  return prisma.restaurant.create({ data });
};

export const getRestaurantById = async (id: string) => {
  return prisma.restaurant.findUnique({ where: { id } });
};

export const getAllRestaurants = async () => {
  return prisma.restaurant.findMany();
};
