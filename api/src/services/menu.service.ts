import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getMenuByRestaurantId = async (restaurantId: string) => {
  return prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { displayOrder: "asc" },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: { displayOrder: "asc" },
      }
    }
  });
};

export const createMenuItem = async (data: any) => {
  return prisma.menuItem.create({ data });
};