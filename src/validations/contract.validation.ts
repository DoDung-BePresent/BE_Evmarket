import { z } from "zod";

export const contractValidation = {
  getContract: z.object({
    params: z.object({
      transactionId: z.string().uuid("Invalid transaction ID"),
    }),
  }),
};
