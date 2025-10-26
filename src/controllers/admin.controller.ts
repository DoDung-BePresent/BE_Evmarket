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
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Services
 */
import { transactionService } from "@/services/transaction.service";

/**
 * Validations
 */
import { GetUsersQuery } from "@/validations/admin.validation";

export const adminController = {
  getUsers: asyncHandler(async (req, res) => {
    const query = req.validated?.query as GetUsersQuery;
    const options = pick(query, ["sortBy", "limit", "page", "sortOrder"]);
    const filter = pick(query, ["role", "isLocked", "search"]);

    const result = await adminService.getUsers(filter, options);

    res.status(STATUS_CODE.OK).json({
      message: "Users fetched successfully",
      data: result,
    });
  }),
  lockUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { lockReason } = req.body;

    await adminService.lockUser(userId, lockReason);

    res.status(STATUS_CODE.OK).json({
      message: "User locked successfully",
    });
  }),

  unlockUser: asyncHandler(async (req, res) => {
    const { userId } = req.params;
    await adminService.unlockUser(userId);

    res.status(STATUS_CODE.OK).json({
      message: "User unlocked successfully",
    });
  }),
  getPendingAuctionRequests: asyncHandler(async (req, res) => {
    const options = pick(req.validated?.query, [
      "sortBy",
      "sortOrder",
      "limit",
      "page",
      "status",
    ]);
    const result = await adminService.getPendingAuctionRequests(options);
    res.status(STATUS_CODE.OK).json({
      message: "Pending auction requests fetched successfully",
      data: result,
    });
  }),
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
