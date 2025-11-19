/**
 * Node modules
 */
import { Router } from "express";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { uploadDisputeImages } from "@/middlewares/upload.middleware";

/**
 * Controllers
 */
import { transactionController } from "@/controllers/transaction.controller";
import { transactionValidation } from "@/validations/transaction.validation";

const transactionRouter = Router();

transactionRouter.use(authenticate);

transactionRouter.post(
  "/:transactionId/pay",
  validate(transactionValidation.payForAuction),
  transactionController.payForAuctionTransaction,
);

transactionRouter.post(
  "/:transactionId/pay-remainder",
  validate(transactionValidation.payRemainder),
  transactionController.payRemainder,
);

transactionRouter.post(
  "/:transactionId/reject",
  validate(transactionValidation.rejectPurchase),
  transactionController.rejectPurchase,
);

transactionRouter.post(
  "/:transactionId/ship",
  validate(transactionValidation.shipTransaction),
  transactionController.shipTransaction,
);

transactionRouter.post(
  "/:transactionId/confirm-receipt",
  validate(transactionValidation.confirmReceipt),
  transactionController.confirmReceipt,
);

transactionRouter.post(
  "/:transactionId/dispute",
  uploadDisputeImages,
  validate(transactionValidation.disputeTransaction),
  transactionController.disputeTransaction,
);

transactionRouter.get(
  "/me",
  validate(transactionValidation.getMyTransactions),
  transactionController.getMyTransactions,
);

transactionRouter.get(
  "/sales",
  validate(transactionValidation.getMySales),
  transactionController.getMySales,
);

export default transactionRouter;
