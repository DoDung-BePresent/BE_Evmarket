/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Validations
 */
import { GetWalletHistoryQuery } from "@/validations/wallet.validation";
/**
 * Services
 */
import { walletService } from "@/services/wallet.service";

export const walletController = {
  getWalletBalance: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const wallet = await walletService.getWalletByUserId(userId);
    res.status(STATUS_CODE.OK).json({
      message: "Wallet balance fetched successfully",
      data: wallet,
    });
  }),
  depositToWallet: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { amount } = req.validated?.body;

    const paymentInfo = await walletService.createDepositRequest(
      userId,
      amount,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Deposit request created. Please proceed with payment.",
      data: paymentInfo,
    });
  }),
  getHistory: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const query = req.validated?.query as GetWalletHistoryQuery;
    const options = pick(query, ["sortBy", "sortOrder", "page", "limit"]);
    const result = await walletService.getFinancialHistory(userId, options);
    res.status(STATUS_CODE.OK).json({
      message: "Financial history fetched successfully",
      data: result,
    });
  }),
};
