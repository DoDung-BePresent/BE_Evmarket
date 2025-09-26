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
import { transactionService } from "@/services/transaction.service";

export const transactionController = {
  createTransaction: asyncHandler(async (req, res) => {
    const { id: buyerId } = req.user!;
    const { vehicleId, batteryId } = req.body;
    const transaction = await transactionService.createTransaction(
      buyerId,
      vehicleId,
      batteryId,
    );
    res.status(STATUS_CODE.CREATED).json({
      message: "Transaction created",
      data: { transaction },
    });
  }),
  completeTransaction: asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const transaction =
      await transactionService.completeTransaction(transactionId);
    res.status(STATUS_CODE.OK).json({
      message: "Transaction completed",
      data: { transaction },
    });
  }),
  getMyTransactions: asyncHandler(async (req, res) => {
    const { id: buyerId } = req.user!;
    const transactions =
      await transactionService.getTransactionsByBuyer(buyerId);
    res.status(STATUS_CODE.OK).json({
      message: "Fetched transactions",
      data: { transactions },
    });
  }),
};
