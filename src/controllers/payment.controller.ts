/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Libs
 */
import logger from "@/libs/logger";

/**
 * Services
 */
import { momoService } from "@/services/momo.service";
import { walletService } from "@/services/wallet.service";
import { checkoutService } from "@/services/checkout.service";
import prisma from "@/libs/prisma";

export const paymentController = {
  handleMomoIpn: asyncHandler(async (req, res) => {
    const isValid = momoService.verifyIpnSignature(req.body);

    if (!isValid) {
      logger.warn("MoMo IPN: Invalid signature", { body: req.body });
      return res.status(STATUS_CODE.NO_CONTENT).send();
    }

    const { orderId, amount, resultCode, transId } = req.body;

    if (resultCode === 0) {
      const transaction = await prisma.transaction.findUnique({
        where: { id: orderId },
      });

      if (transaction) {
        await checkoutService.completeMomoPurchase(orderId, amount);
      } else {
        await walletService.processSuccessfulDeposit(
          orderId,
          amount,
          transId.toString(),
        );
      }

      logger.info(
        `MoMo IPN: Successfully processed payment for order ${orderId}`,
      );
    } else {
      await walletService.processFailedDeposit(orderId);
      logger.warn(`MoMo IPN: Failed payment for order ${orderId}`, {
        resultCode,
      });
    }

    res.status(STATUS_CODE.NO_CONTENT).send();
  }),
};
