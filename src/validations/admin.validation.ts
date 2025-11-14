/**
 * Node modules
 */
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { ListingStatus } from "@prisma/client";

export const adminValidation = {
  getPendingAuctionRequests: z.object({
    query: z.object({
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      status: z
        .enum([
          "ALL",
          "AUCTION_PENDING_APPROVAL",
          "AUCTION_REJECTED",
          "AUCTION_LIVE",
          "AUCTION_ENDED",
          "AUCTION_PAYMENT_PENDING",
        ])
        .optional()
        .default("ALL"),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  reviewAuctionRequest: z
    .object({
      body: z.object({
        approved: z.boolean(),
        rejectionReason: z.string().optional(),
        auctionStartsAt: z.string().datetime({ offset: true }).optional(), 
        auctionEndsAt: z.string().datetime({ offset: true }).optional(),
      }),
      params: z.object({
        listingId: z.cuid("Invalid listing ID"),
        listingType: z.enum(["VEHICLE", "BATTERY"]),
      }),
    })
    .superRefine((data, ctx) => {
      if (data.body.approved) {
        if (!data.body.auctionStartsAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auction start date is required for approval.",
            path: ["body", "auctionStartsAt"],
          });
        }
        if (!data.body.auctionEndsAt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auction end date is required for approval.",
            path: ["body", "auctionEndsAt"],
          });
        }
        if (
          data.body.auctionStartsAt &&
          data.body.auctionEndsAt &&
          data.body.auctionStartsAt >= data.body.auctionEndsAt
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Auction end date must be after the start date.",
            path: ["body", "auctionEndsAt"],
          });
        }
      } else {
        if (!data.body.rejectionReason) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Rejection reason is required when not approving.",
            path: ["body", "rejectionReason"],
          });
        }
      }
    }),
  resolveDispute: z.object({
    params: z.object({
      transactionId: z.string().uuid(),
    }),
    body: z.object({
      approved: z.boolean(), // true = refund to buyer, false = complete for seller
    }),
  }),
  getUsers: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      role: z.enum(UserRole).optional(),
      isLocked: z
        .string()
        .transform((val) => val === "true")
        .optional(),
      search: z.string().optional(),
    }),
  }),
  getListings: z.object({
    query: z.object({
      listingType: z.enum(["VEHICLE", "BATTERY", "ALL"]).default("ALL"),
      isVerified: z
        .string()
        .transform((val) => val === "true")
        .optional(),
      status: z.nativeEnum(ListingStatus).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  verifyListing: z.object({
    params: z.object({
      listingType: z.enum(["VEHICLE", "BATTERY"]),
      listingId: z.string().cuid(),
    }),
    body: z.object({
      isVerified: z.boolean(),
    }),
  }),
  lockUser: z.object({
    params: z.object({
      userId: z.string().cuid(),
    }),
    body: z.object({
      lockReason: z
        .string("Lock reason is required")
        .min(10, "Lock reason must be at least 10 characters long"),
    }),
  }),
  unlockUser: z.object({
    params: z.object({
      userId: z.string().cuid(),
    }),
  }),
  updateFee: z.object({
    params: z.object({
      feeId: z.string().cuid(),
    }),
    body: z.object({
      percentage: z.coerce
        .number()
        .min(0, "Percentage cannot be negative")
        .max(100, "Percentage cannot exceed 100"),
      description: z.string().optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  getDisputedTransactions: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
  }),
  getContracts: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
  }),
};

export type GetUsersQuery = z.infer<typeof adminValidation.getUsers>["query"];
export type GetListingsQuery = z.infer<
  typeof adminValidation.getListings
>["query"];
export type GetContractsQuery = z.infer<
  typeof adminValidation.getContracts
>["query"];
export type GetDisputedTransactionsQuery = z.infer<
  typeof adminValidation.getDisputedTransactions
>["query"];
