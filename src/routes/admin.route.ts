import { Router } from "express";
import { adminController } from "@/controllers/admin.controller";
import { authenticate, authorize } from "@/middlewares/auth.middleware";

const adminRouter = Router();

adminRouter.patch(
  "/listings/:listingType/:listingId/approve",
  authenticate,
  authorize(["STAFF", "ADMIN"]),
  adminController.approveListing,
);

adminRouter.get(
  "/transactions/completed",
  authenticate,
  authorize(["ADMIN"]),
  adminController.getCompletedTransactions,
);

export default adminRouter;
