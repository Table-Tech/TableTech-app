import { PrismaClient } from "@prisma/client";
import { ApiError } from '../types/errors.js';
const prisma = new PrismaClient();

type TableStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

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

// NEW: Generate QR URL for table
export const generateQRUrl = async (tableId: string) => {
  const table = await prisma.table.findUnique({
    where: { id: tableId },
    include: {
      restaurant: {
        select: { id: true, name: true }
      }
    }
  });

  if (!table) {
    throw new ApiError(404, 'TABLE_NOT_FOUND', 'Table not found');
  }

  // Generate the customer menu URL
  // TODO: Replace with your actual frontend domain
  const frontendDomain = process.env.FRONTEND_URL || "https://your-app.com";
  const qrUrl = `${frontendDomain}/menu/${table.code}/${table.restaurantId}`;

  // Optionally update the table record with the QR URL
  await prisma.table.update({
    where: { id: tableId },
    data: { qrCodeUrl: qrUrl }
  });

  return {
    qrUrl,
    table: {
      id: table.id,
      number: table.number,
      code: table.code,
      restaurant: table.restaurant
    }
  };
};