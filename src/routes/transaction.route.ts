/**
 * Node modules
 */
import { Router } from "express";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";

/**
 * Controllers
 */
import { validate } from "@/middlewares/validate.middleware";
import { transactionController } from "@/controllers/transaction.controller";
import { transactionValidation } from "@/validations/transaction.validation";

const transactionRouter = Router();

// TODO: fail case?
transactionRouter.post(
  "/",
  authenticate,
  validate(transactionValidation.createTransaction),
  transactionController.createTransaction,
);
transactionRouter.patch(
  "/:transactionId/complete",
  authenticate,
  validate(transactionValidation.completeTransaction),
  transactionController.completeTransaction,
);
transactionRouter.get(
  "/me",
  authenticate,
  transactionController.getMyTransactions,
);

export default transactionRouter;
