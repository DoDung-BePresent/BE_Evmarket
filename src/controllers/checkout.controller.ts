/* eslint-disable no-unsafe-optional-chaining */
/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { checkoutService } from "@/services/checkout.service";

export const checkoutController = {
  initiateCheckout: asyncHandler(async (req, res) => {
    const { id: buyerId } = req.user!;
    const result = await checkoutService.initiateCheckout(
      buyerId,
      req.validated?.body,
    );
    res.status(STATUS_CODE.CREATED).json({
      message: "Checkout initiated successfully",
      data: result,
    });
  }),

  payWithWallet: asyncHandler(async (req, res) => {
    const { id: buyerId } = req.user!;
    const { transactionId } = req.validated?.params;
    const transaction = await checkoutService.payWithWallet(
      transactionId,
      buyerId,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Payment successful",
      data: transaction,
    });
  }),
};
