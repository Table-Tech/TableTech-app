import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CreateCategoryInput = {
  name: string;
  restaurantId: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
};

type UpdateCategoryInput = {
  name?: string;
  description?: string;
  imageUrl?: string;
  displayOrder?: number;
  isActive?: boolean;
};

export const createCategory = async (data: CreateCategoryInput) => {
  return prisma.menuCategory.create({
    data: {
      name: data.name,
      description: data.description,
      imageUrl: data.imageUrl,
      displayOrder: data.displayOrder || 0,
      isActive: data.isActive ?? true,
      restaurant: {
        connect: { id: data.restaurantId },
      },
    },
  });
};

export const getCategoriesByRestaurant = async (restaurantId: string) => {
  return prisma.menuCategory.findMany({
    where: { 
      restaurantId,
      isActive: true  // Only return active categories
    },
    orderBy: { displayOrder: "asc" },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};

export const getCategoryById = async (id: string) => {
  return prisma.menuCategory.findUnique({
    where: { id },
    include: {
      menuItems: {
        where: { isAvailable: true },
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};

export const updateCategory = async (id: string, data: UpdateCategoryInput) => {
  return prisma.menuCategory.update({
    where: { id },
    data,
  });
};

export const deleteCategory = async (id: string) => {
  // Soft delete - set isActive to false
  return prisma.menuCategory.update({
    where: { id },
    data: { isActive: false },
  });
};