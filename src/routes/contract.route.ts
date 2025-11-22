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

// Route mới để xem HTML
contractRouter.get(
  "/:transactionId/view",
  validate(contractValidation.getContract),
  contractController.viewContract,
);

// Route mới để tải PDF
contractRouter.get(
  "/:transactionId/download",
  validate(contractValidation.getContract),
  contractController.downloadContract,
);

// Route cũ có thể giữ lại để lấy URL nếu cần
contractRouter.get(
  "/:transactionId/url",
  validate(contractValidation.getContract),
  contractController.getContractUrl,
);
export default contractRouter;
