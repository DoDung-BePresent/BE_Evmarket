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
  getHistory: z.object({
    query: z.object({
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
};

export type GetWalletHistoryQuery = z.infer<
  typeof walletValidation.getHistory
>["query"];
