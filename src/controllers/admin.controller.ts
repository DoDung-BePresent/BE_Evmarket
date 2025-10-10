/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { adminService } from "@/services/admin.service";

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
  approveListing: asyncHandler(async (req, res) => {
    const { listingType, listingId } = req.params;
    const listing = await adminService.approveListing(
      listingType as any,
      listingId,
    );
    res.status(STATUS_CODE.OK).json({
      message: `${listingType} approved successfully`,
      data: listing,
    });
  }),
};
