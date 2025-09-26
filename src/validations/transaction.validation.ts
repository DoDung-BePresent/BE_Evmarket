/**
 * Node modules
 */
import z from "zod";

export const transactionValidation = {
  createTransaction: z.object({
    body: z.object({
      vehicleId: z.cuid().optional(),
      batteryId: z.cuid().optional(),
    }),
  }),
  completeTransaction: z.object({
    params: z.object({
      transactionId: z.cuid(),
    }),
  }),
};
