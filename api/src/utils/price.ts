import { Decimal } from "@prisma/client/runtime/library";

export const formatPrice = (price: Decimal | number): string => {
  if (typeof price === 'number') {
    return price.toFixed(2);
  }
  return price.toFixed(2);
};

export const formatPriceNumber = (price: Decimal | number): number => {
  if (typeof price === 'number') {
    return Number(price.toFixed(2));
  }
  return Number(price.toFixed(2));
};