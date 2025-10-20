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
      transactionId: z.uuid(),
    }),
  }),
  getMyTransactions: z.object({
    query: z.object({
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
};

export type GetMyTransactionsQuery = z.infer<
  typeof transactionValidation.getMyTransactions
>["query"];
