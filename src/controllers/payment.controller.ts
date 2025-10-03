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

export const paymentController = {
  handleMomoIpn: asyncHandler(async (req, res) => {
    const isValid = momoService.verifyIpnSignature(req.body);

    if (!isValid) {
      logger.warn("MoMo IPN: Invalid signature", { body: req.body });
      // Không trả về lỗi để tránh MoMo gửi lại, chỉ log lại
      return res.status(STATUS_CODE.NO_CONTENT).send();
    }

    const { orderId, amount, resultCode, transId } = req.body;

    if (resultCode === 0) {
      // Thanh toán thành công
      await walletService.processSuccessfulDeposit(orderId, amount, transId.toString());
      logger.info(
        `MoMo IPN: Successfully processed deposit for order ${orderId}`,
      );
    } else {
      // Thanh toán thất bại
      await walletService.processFailedDeposit(orderId);
      logger.warn(`MoMo IPN: Failed payment for order ${orderId}`, {
        resultCode,
      });
    }

    // Phản hồi cho MoMo để không gửi lại IPN
    res.status(STATUS_CODE.NO_CONTENT).send();
  }),
};
