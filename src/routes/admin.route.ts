import { Router } from "express";
import { adminController } from "@/controllers/admin.controller";
import { authenticate } from "@/middlewares/auth.middleware";

const adminRouter = Router();

// TODO: set chi admin moi dc
adminRouter.get(
  "/transactions/completed",
  authenticate,
  adminController.getCompletedTransactions,
);

export default adminRouter;
