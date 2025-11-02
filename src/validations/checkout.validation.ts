import { z } from "zod";
import { PaymentGateway } from "@prisma/client";

export const checkoutValidation = {
  initiateCheckout: z.object({
    body: z.object({
      listingId: z.string().cuid(),
      listingType: z.enum(["VEHICLE", "BATTERY"]),
      paymentMethod: z.enum(PaymentGateway),
      redirectUrl: z.string().url("Invalid redirect URL"),
    }),
  }),
  payWithWallet: z.object({
    params: z.object({
      transactionId: z.uuid(),
    }),
  }),
};
