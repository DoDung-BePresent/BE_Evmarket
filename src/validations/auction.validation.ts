import { z } from "zod";

export const auctionValidation = {
  placeBid: z.object({
    body: z.object({
      amount: z.coerce
        .number()
        .positive("Bid amount must be a positive number"),
    }),
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
    }),
  }),
};
