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

adminRouter.get(
  "/auction-requests",
  authenticate,
  authorize(["STAFF", "ADMIN"]),
  validate(adminValidation.getPendingAuctionRequests),
  adminController.getPendingAuctionRequests,
);

adminRouter.patch(
  "/listings/:listingType/:listingId/approve",
  authenticate,
  authorize(["STAFF", "ADMIN"]),
  validate(adminValidation.approveListing),
  adminController.approveListing,
);

adminRouter.patch(
  "/listings/:listingType/:listingId/review-auction",
  authenticate,
  authorize(["STAFF", "ADMIN"]),
  validate(adminValidation.reviewAuctionRequest),
  adminController.reviewAuctionRequest,
);

adminRouter.get(
  "/transactions/completed",
  authenticate,
  authorize(["ADMIN"]),
  adminController.getCompletedTransactions,
);

export default adminRouter;
