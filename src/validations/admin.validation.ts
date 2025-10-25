import { z } from "zod";

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
        auctionStartsAt: z.coerce.date().optional(),
        auctionEndsAt: z.coerce.date().optional(),
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
  approveListing: z.object({
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
};
