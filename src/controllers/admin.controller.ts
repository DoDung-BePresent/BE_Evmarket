import { STATUS_CODE } from "@/constants/error.constant";
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { transactionService } from "@/services/transaction.service";

export const adminController = {
  getCompletedTransactions: asyncHandler(async (req, res) => {
    const transactions = await transactionService.getCompletedTransactions();
    res.status(STATUS_CODE.OK).json({
      message: "Completed transactions fetched",
      data: { transactions },
    });
  }),
};
