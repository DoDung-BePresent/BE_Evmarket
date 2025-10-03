/**
 * Node modules
 */
import { z } from "zod";

export const walletValidation = {
  deposit: z.object({
    body: z.object({
      amount: z.coerce
        .number()
        .positive("Amount must be a positive number")
        .min(10000, "Minimum deposit amount is 10,000 VND"),
    }),
  }),
};
