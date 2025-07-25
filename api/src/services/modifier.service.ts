import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Price formatting utility (replacing deleted price.ts)
const formatPrice = (price: number): number => {
  // Ensure price has max 2 decimal places
  return Math.round(price * 100) / 100;
};

type CreateModifierInput = {
  name: string;
  modifierGroupId: string;
  price: number;
  displayOrder?: number;
};

type UpdateModifierInput = {
  name?: string;
  price?: number;
  displayOrder?: number;
};

export const createModifier = async (data: CreateModifierInput) => {
  return prisma.modifier.create({
    data: {
      name: data.name,
      price: formatPrice(data.price),
      displayOrder: data.displayOrder ?? 0,
      modifierGroup: {
        connect: { id: data.modifierGroupId },
      },
    },
  });
};

export const getModifiersByGroup = async (modifierGroupId: string) => {
  return prisma.modifier.findMany({
    where: { modifierGroupId },
    orderBy: { displayOrder: "asc" },
  });
};

export const getModifierById = async (id: string) => {
  return prisma.modifier.findUnique({
    where: { id },
    include: {
      modifierGroup: {
        select: { id: true, name: true },
      },
    },
  });
};

export const updateModifier = async (id: string, data: UpdateModifierInput) => {
  const updateData: any = {};
  
  if (data.name) updateData.name = data.name;
  if (data.price !== undefined) updateData.price = formatPrice(data.price);
  if (data.displayOrder !== undefined) updateData.displayOrder = data.displayOrder;

  return prisma.modifier.update({
    where: { id },
    data: updateData,
  });
};

export const deleteModifier = async (id: string) => {
  return prisma.modifier.delete({
    where: { id },
  });
};