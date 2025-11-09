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
import { walletController } from "@/controllers/wallet.controller";

/**
 * Validations
 */
import { walletValidation } from "@/validations/wallet.validation";

const walletRouter = Router();

walletRouter.use(authenticate);

walletRouter.get("/", walletController.getWalletBalance);
walletRouter.post(
  "/deposit",
  validate(walletValidation.deposit),
  walletController.depositToWallet,
);
walletRouter.get(
  "/history",
  validate(walletValidation.getHistory),
  walletController.getHistory,
);

export default walletRouter;
