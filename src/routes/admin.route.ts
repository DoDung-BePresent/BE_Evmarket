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
  "/listings",
  validate(adminValidation.getListings),
  adminController.getListings,
);

adminRouter.patch(
  "/listings/:listingType/:listingId/verify",
  validate(adminValidation.verifyListing),
  adminController.verifyListing,
);

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

adminRouter.get("/fees", adminController.getFees);

adminRouter.patch(
  "/fees/:feeId",
  validate(adminValidation.updateFee),
  adminController.updateFee,
);

adminRouter.get(
  "/auction-requests",
  validate(adminValidation.getPendingAuctionRequests),
  adminController.getPendingAuctionRequests,
);

adminRouter.patch(
  "/listings/:listingType/:listingId/review-auction",
  validate(adminValidation.reviewAuctionRequest),
  adminController.reviewAuctionRequest,
);

export default adminRouter;
