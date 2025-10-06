import { z } from "zod";

export const adminValidation = {
  approveListing: z.object({
    params: z.object({
      listingId: z.cuid("Invalid listing ID"),
    }),
  }),
};
