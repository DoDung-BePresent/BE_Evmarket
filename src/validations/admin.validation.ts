import { z } from "zod";

export const adminValidation = {
  getPendingAuctionRequests: z.object({
    query: z.object({
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  reviewAuctionRequest: z.object({
    body: z.object({
      approved: z.boolean(),
      rejectionReason: z.string().optional(),
    }),
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
  approveListing: z.object({
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
};
