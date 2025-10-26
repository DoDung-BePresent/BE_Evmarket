/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { adminController } from "@/controllers/admin.controller";

/**
 * Validations
 */
import { adminValidation } from "@/validations/admin.validation";

/**
 * Middlewares
 */
import { validate } from "@/middlewares/validate.middleware";
import { authenticate, authorize } from "@/middlewares/auth.middleware";

const adminRouter = Router();

adminRouter.use(authenticate, authorize(["STAFF", "ADMIN"]));

adminRouter.get(
  "/users",
  validate(adminValidation.getUsers),
  adminController.getUsers,
);

adminRouter.patch(
  "/users/:userId/lock",
  validate(adminValidation.lockUser),
  adminController.lockUser,
);

adminRouter.patch(
  "/users/:userId/unlock",
  validate(adminValidation.unlockUser),
  adminController.unlockUser,
);

adminRouter.get(
  "/auction-requests",
  validate(adminValidation.getPendingAuctionRequests),
  adminController.getPendingAuctionRequests,
);

adminRouter.patch(
  "/listings/:listingType/:listingId/approve",
  validate(adminValidation.approveListing),
  adminController.approveListing,
);

adminRouter.patch(
  "/listings/:listingType/:listingId/review-auction",
  validate(adminValidation.reviewAuctionRequest),
  adminController.reviewAuctionRequest,
);

adminRouter.get(
  "/transactions/completed",
  adminController.getCompletedTransactions,
);

export default adminRouter;
