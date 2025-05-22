import { PrismaClient, TableStatus  } from "@prisma/client";
const prisma = new PrismaClient();

type CreateTableInput = {
  number: number;
  code: string;
  capacity?: number;
  restaurantId: string;
  qrCodeUrl?: string;
};

export const createTable = async (data: CreateTableInput) => {
  return prisma.table.create({
    data: {
      number: data.number,
      code: data.code,
      capacity: data.capacity,
      qrCodeUrl: data.qrCodeUrl,
      restaurant: {
        connect: { id: data.restaurantId },
      },
    },
  });
};

export const getTablesByRestaurantId = async (restaurantId: string) => {
  return prisma.table.findMany({
    where: { restaurantId },
    orderBy: { number: "asc" },
  });
};

export const updateTableStatus = async (id: string, status: TableStatus) => {
  return prisma.table.update({
    where: { id },
    data: { status },
  });
};
