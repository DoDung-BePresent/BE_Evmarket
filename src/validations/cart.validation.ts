import { z } from "zod";

export const cartValidation = {
  addToCart: z.object({
    body: z.object({
      batteryId: z.cuid("Invalid battery ID"),
    }),
  }),
  removeFromCart: z.object({
    params: z.object({
      itemId: z.cuid("Invalid cart item ID"),
    }),
  }),
};
