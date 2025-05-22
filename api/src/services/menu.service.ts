import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type CreateMenuInput = {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  preparationTime?: number;
  displayOrder?: number;
  categoryId: string;
  restaurantId: string;
};

export const createMenuItem = async (data: CreateMenuInput) => {
  return prisma.menuItem.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      imageUrl: data.imageUrl,
      isAvailable: data.isAvailable,
      preparationTime: data.preparationTime,
      displayOrder: data.displayOrder,
      category: {
        connect: { id: data.categoryId },
      },
      restaurant: {
        connect: { id: data.restaurantId },
      },
    },
  });
};

export const getMenuByRestaurantId = async (restaurantId: string) => {
  return prisma.menuCategory.findMany({
    where: { restaurantId },
    orderBy: { displayOrder: "asc" },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};
