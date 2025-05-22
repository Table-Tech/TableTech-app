import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";

const prisma = new PrismaClient();

type CreateOrderInput = {
  tableId: string;
  restaurantId: string;
  notes?: string;
  orderItems: {
    menuItemId: string;
    quantity: number;
    notes?: string;
    modifiers?: string[];
  }[];
};

export const createOrder = async (data: CreateOrderInput) => {
  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${uuidv4().split("-")[0]}`,
      status: "PENDING",
      paymentStatus: "PENDING",
      notes: data.notes,
      totalAmount: 0, // TODO: calculate total amount based on items and modifiers
      table: { connect: { id: data.tableId } },
      restaurant: { connect: { id: data.restaurantId } },
      orderItems: {
        create: data.orderItems.map((item) => ({
          quantity: item.quantity,
          price: 0, // TODO: pull price from menuItem in future
          ...(item.notes ? { notes: item.notes } : {}),
          menuItem: { connect: { id: item.menuItemId } },
          modifiers: item.modifiers
            ? {
                create: item.modifiers.map((modId) => ({
                  modifier: { connect: { id: modId } },
                  price: 0, // TODO: pull price from modifier in future
                })),
              }
            : undefined,
        })),
      },
    },
    include: {
      orderItems: {
        include: {
          modifiers: true,
        },
      },
    },
  });

  return order;
};


export const getOrderById = async (id: string) => {
  return prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: {
        include: {
          menuItem: true,
          modifiers: {
            include: {
              modifier: true,
            },
          },
        },
      },
    },
  });
};

export const getOrdersByRestaurant = async (restaurantId: string) => {
  return prisma.order.findMany({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
    include: {
      table: true,
      orderItems: {
        include: {
          menuItem: true,
          modifiers: {
            include: { modifier: true },
          },
        },
      },
    },
  });
};
