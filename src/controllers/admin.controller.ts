/* eslint-disable @typescript-eslint/no-explicit-any, no-unsafe-optional-chaining */
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
  reviewAuctionRequest: asyncHandler(async (req, res) => {
    const { listingType, listingId } = req.validated?.params;
    const listing = await adminService.reviewAuctionRequest(
      listingType,
      listingId,
      req.validated?.body,
    );
    res.status(STATUS_CODE.OK).json({
      message: `Auction request has been ${req.validated?.body.approved ? "approved" : "rejected"}.`,
      data: listing,
    });
  }),
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
