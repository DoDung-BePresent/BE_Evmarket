import { z } from "zod";

export const auctionValidation = {
  requestAuction: z
    .object({
      body: z.object({
        startingPrice: z.coerce
          .number()
          .positive("Starting price must be positive"),
        bidIncrement: z.coerce
          .number()
          .positive("Bid increment must be positive"),
        depositAmount: z.coerce
          .number()
          .positive("Deposit amount must be positive")
          .optional(),
        auctionStartsAt: z.coerce.date().refine((date) => date > new Date(), {
          message: "Auction start date must be in the future",
        }),
        auctionEndsAt: z.coerce.date().refine((date) => date > new Date(), {
          message: "Auction end date must be in the future",
        }),
      }),
      params: z.object({
        listingId: z.cuid("Invalid listing ID"),
        listingType: z.enum(["VEHICLE", "BATTERY"]),
      }),
    })
    .refine((data) => data.body.auctionStartsAt < data.body.auctionEndsAt, {
      message: "Auction end date must be after the start date.",
      path: ["body", "auctionEndsAt"],
    }),
  placeBid: z.object({
    body: z.object({
      amount: z.coerce.number().positive("Bid amount must be positive"),
    }),
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
  depositParams: z.object({
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
    }),
  }),
};
