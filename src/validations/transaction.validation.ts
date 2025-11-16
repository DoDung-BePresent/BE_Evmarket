/**
 * Node modules
 */
import z from "zod";
import { PaymentGateway } from "@prisma/client";

export const transactionValidation = {
  shipTransaction: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
  }),
  confirmReceipt: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
  }),
  disputeTransaction: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
    body: z.object({
      reason: z
        .string()
        .min(10, "Dispute reason must be at least 10 characters long."),
    }),
  }),
  payForAuction: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
    body: z.object({
      paymentMethod: z.enum(PaymentGateway),
      redirectUrl: z.url().optional(),
    }),
  }),
  payRemainder: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
    body: z.object({
      paymentMethod: z.enum(PaymentGateway),
      redirectUrl: z.url().optional(),
    }),
  }),
  rejectPurchase: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
  }),
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
  getMySales: z.object({
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
