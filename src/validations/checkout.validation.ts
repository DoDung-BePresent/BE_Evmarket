import { z } from "zod";
import { PaymentGateway } from "@prisma/client";

export const checkoutValidation = {
  initiateCheckout: z
    .object({
      body: z.object({
        listingId: z.string().cuid().optional(),
        listingType: z.enum(["VEHICLE", "BATTERY"]).optional(),
        paymentMethod: z.enum(PaymentGateway),
        redirectUrl: z.url("Invalid redirect URL").optional(),
      }),
    })
    .refine(
      (data) => {
        // If listingId is provided, listingType must also be provided, and vice-versa.
        // If both are absent, it's a cart checkout.
        return (
          (data.body.listingId && data.body.listingType) ||
          (!data.body.listingId && !data.body.listingType)
        );
      },
      {
        message:
          "listingId and listingType must be provided together, or both must be omitted for cart checkout.",
        path: ["body"],
      },
    ),
  payWithWallet: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
  }),
};
