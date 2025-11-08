/**
 * Node modules
 */
import { Router } from "express";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";

/**
 * Controllers
 */
import { transactionController } from "@/controllers/transaction.controller";
import { transactionValidation } from "@/validations/transaction.validation";

const transactionRouter = Router();

transactionRouter.use(authenticate);

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
  validate(transactionValidation.disputeTransaction),
  transactionController.disputeTransaction,
);

transactionRouter.get(
  "/me",
  validate(transactionValidation.getMyTransactions),
  transactionController.getMyTransactions,
);

export default transactionRouter;
