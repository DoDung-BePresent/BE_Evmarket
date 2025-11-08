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
import { contractController } from "@/controllers/contract.controller";

/**
 * Validations
 */
import { contractValidation } from "@/validations/contract.validation";

const contractRouter = Router();

contractRouter.use(authenticate);

contractRouter.get(
  "/:transactionId",
  validate(contractValidation.getContract),
  contractController.getContract,
);

export default contractRouter;
