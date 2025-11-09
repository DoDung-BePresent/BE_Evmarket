import { z } from "zod";
import { PaymentGateway } from "@prisma/client";

export const checkoutValidation = {
  initiateCheckout: z.object({
    body: z.object({
      listingId: z.string().cuid(),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
      paymentMethod: z.enum(PaymentGateway),
      redirectUrl: z.url("Invalid redirect URL").optional(),
    }),
  }),
  payWithWallet: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
  }),
};
