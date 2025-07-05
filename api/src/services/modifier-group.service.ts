import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CreateModifierGroupInput = {
  name: string;
  menuItemId: string;
  required?: boolean;
  multiSelect?: boolean;
  minSelect?: number;
  maxSelect?: number;
  displayOrder?: number;
};

type UpdateModifierGroupInput = {
  name?: string;
  required?: boolean;
  multiSelect?: boolean;
  minSelect?: number;
  maxSelect?: number;
  displayOrder?: number;
};

export const createModifierGroup = async (data: CreateModifierGroupInput) => {
  return prisma.modifierGroup.create({
    data: {
      name: data.name,
      required: data.required ?? false,
      multiSelect: data.multiSelect ?? false,
      minSelect: data.minSelect ?? 0,
      maxSelect: data.maxSelect,
      displayOrder: data.displayOrder ?? 0,
      menuItem: {
        connect: { id: data.menuItemId },
      },
    },
    include: {
      modifiers: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};

export const getModifierGroupsByMenuItem = async (menuItemId: string) => {
  return prisma.modifierGroup.findMany({
    where: { menuItemId },
    orderBy: { displayOrder: "asc" },
    include: {
      modifiers: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};

export const getModifierGroupById = async (id: string) => {
  return prisma.modifierGroup.findUnique({
    where: { id },
    include: {
      modifiers: {
        orderBy: { displayOrder: "asc" },
      },
      menuItem: {
        select: { id: true, name: true },
      },
    },
  });
};

export const updateModifierGroup = async (id: string, data: UpdateModifierGroupInput) => {
  return prisma.modifierGroup.update({
    where: { id },
    data,
    include: {
      modifiers: {
        orderBy: { displayOrder: "asc" },
      },
    },
  });
};

export const deleteModifierGroup = async (id: string) => {
  // First delete all modifiers in this group
  await prisma.modifier.deleteMany({
    where: { modifierGroupId: id },
  });
  
  // Then delete the group
  return prisma.modifierGroup.delete({
    where: { id },
  });
};