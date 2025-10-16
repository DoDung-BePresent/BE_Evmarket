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
import { checkoutController } from "@/controllers/checkout.controller";

/**
 * Validations
 */
import { checkoutValidation } from "@/validations/checkout.validation";

const checkoutRouter = Router();

checkoutRouter.use(authenticate);

checkoutRouter.post(
  "/",
  validate(checkoutValidation.initiateCheckout),
  checkoutController.initiateCheckout,
);

checkoutRouter.post(
  "/:transactionId/pay-with-wallet",
  validate(checkoutValidation.payWithWallet),
  checkoutController.payWithWallet,
);

export default checkoutRouter;
