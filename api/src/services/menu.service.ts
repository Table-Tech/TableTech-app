import { PrismaClient } from "@prisma/client";
import { ApiError } from '../types/errors.js';
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

// NEW: Get customer menu by table code and restaurant ID
export const getCustomerMenu = async (tableCode: string, restaurantId: string) => {
  // First, find the table by code and restaurant
  const table = await prisma.table.findFirst({
    where: {
      code: tableCode,
      restaurantId: restaurantId,
    },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          address: true,
          phone: true
        }
      }
    }
  });

  if (!table) {
    throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found for the provided code and restaurant');
  }

  // Get the menu for this restaurant
  const menu = await prisma.menuCategory.findMany({
    where: { 
      restaurantId: restaurantId,
      isActive: true 
    },
    orderBy: { displayOrder: "asc" },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: { displayOrder: "asc" },
        include: {
          modifierGroups: {
            include: {
              modifiers: {
                orderBy: { displayOrder: "asc" }
              }
            }
          }
        }
      },
    },
  });

  return {
    restaurant: table.restaurant,
    table: {
      id: table.id,
      number: table.number,
      code: table.code,
      capacity: table.capacity
    },
    menu
  };
};