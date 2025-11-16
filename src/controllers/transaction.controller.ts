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
import { transactionService } from "@/services/transaction.service";
import { checkoutService } from "@/services/checkout.service";

/**
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Validations
 */
import { GetMyTransactionsQuery } from "@/validations/transaction.validation";

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
  payForAuctionTransaction: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { paymentMethod, redirectUrl } = req.validated?.body;
    const { id: buyerId } = req.user!;

    const result = await checkoutService.payForAuctionTransaction(
      buyerId,
      transactionId,
      paymentMethod,
      redirectUrl,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Payment initiated successfully.",
      data: result,
    });
  }),
  payRemainder: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { paymentMethod, redirectUrl } = req.validated?.body;
    const { id: buyerId } = req.user!;

    const result = await checkoutService.payRemainderForVehicle(
      buyerId,
      transactionId,
      paymentMethod,
      redirectUrl,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Remainder payment initiated successfully.",
      data: result,
    });
  }),
  rejectPurchase: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { id: buyerId } = req.user!;

    const transaction = await transactionService.rejectVehiclePurchase(
      transactionId,
      buyerId,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Purchase has been rejected.",
      data: { transaction },
    });
  }),
  shipTransaction: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { id: sellerId } = req.user!;

    const transaction = await transactionService.shipTransaction(
      transactionId,
      sellerId,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Transaction marked as shipped.",
      data: { transaction },
    });
  }),
  confirmReceipt: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { id: buyerId } = req.user!;

    const transaction = await transactionService.confirmReceipt(
      transactionId,
      buyerId,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Receipt confirmed. Transaction completed.",
      data: { transaction },
    });
  }),
  disputeTransaction: asyncHandler(async (req, res) => {
    const { transactionId } = req.validated?.params;
    const { reason } = req.validated?.body;
    const { id: buyerId } = req.user!;
    const files = req.files as Express.Multer.File[];

    const transaction = await transactionService.disputeTransaction(
      transactionId,
      buyerId,
      reason,
      files,
    );

    res.status(STATUS_CODE.OK).json({
      message: "Transaction has been disputed. Admin will review it.",
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
    const query = req.validated?.query as GetMyTransactionsQuery; // Tái sử dụng type từ wallet validation
    const options = pick(query, ["sortBy", "sortOrder", "page", "limit"]);

    const result = await transactionService.getTransactionsByBuyer(
      buyerId,
      options,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Fetched my transactions successfully",
      data: result,
    });
  }),
  getMySales: asyncHandler(async (req, res) => {
    const { id: sellerId } = req.user!;
    const query = req.validated?.query as GetMyTransactionsQuery;
    const options = pick(query, ["sortBy", "sortOrder", "page", "limit"]);

    const result = await transactionService.getTransactionsBySeller(
      sellerId,
      options,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Fetched my sales successfully",
      data: result,
    });
  }),
};
