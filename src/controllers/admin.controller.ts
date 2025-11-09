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
import { adminService } from "@/services/admin.service";

/**
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Validations
 */
import {
  GetDisputedTransactionsQuery,
  GetUsersQuery,
} from "@/validations/admin.validation";

export const adminController = {
  getDashboardStats: asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    res.status(STATUS_CODE.OK).json({
      message: "Dashboard statistics fetched successfully",
      data: stats,
    });
  }),
  getDisputedTransactions: asyncHandler(async (req, res) => {
    const query = req.validated?.query as GetDisputedTransactionsQuery;
    const options = pick(query, ["sortBy", "limit", "page", "sortOrder"]);
    const result = await adminService.getDisputedTransactions(options);
    res.status(STATUS_CODE.OK).json({
      message: "Disputed transactions fetched successfully",
      data: result,
    });
  }),
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
  getListings: asyncHandler(async (req, res) => {
    const query = req.validated?.query;
    const filter = pick(query, ["listingType", "isVerified", "status"]);
    const options = pick(query, ["limit", "page"]);
    const result = await adminService.getListings(filter, options);
    res.status(STATUS_CODE.OK).json({
      message: "Listings fetched successfully",
      data: result,
    });
  }),
  verifyListing: asyncHandler(async (req, res) => {
    const { listingType, listingId } = req.validated?.params;
    const payload = req.validated?.body;
    const updatedListing = await adminService.verifyListing(
      listingType,
      listingId,
      payload,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Listing verification status updated successfully",
      data: updatedListing,
    });
  }),

  getFees: asyncHandler(async (_req, res) => {
    const fees = await adminService.getFees();
    res.status(STATUS_CODE.OK).json({
      message: "Fees fetched successfully",
      data: fees,
    });
  }),

  updateFee: asyncHandler(async (req, res) => {
    const { feeId } = req.validated?.params;
    const payload = req.validated?.body;
    const updatedFee = await adminService.updateFee(feeId, payload);
    res.status(STATUS_CODE.OK).json({
      message: "Fee updated successfully",
      data: updatedFee,
    });
  }),
};
