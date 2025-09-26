/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { userController } from "@/controllers/user.controller";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { userValidation } from "@/validations/user.validation";

const userRouter = Router();

userRouter.get("/me", authenticate, userController.getMe);

userRouter.get(
  "/:sellerId/profile",
  validate(userValidation.getSellerProfileSchema),
  userController.getSellerProfile,
);

export default userRouter;
