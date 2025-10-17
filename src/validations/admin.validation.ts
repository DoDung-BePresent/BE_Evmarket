import { z } from "zod";

export const adminValidation = {
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
    }),
  }),
};
