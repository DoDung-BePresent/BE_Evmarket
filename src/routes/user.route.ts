/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { userController } from "@/controllers/user.controller";

/**
 * Validations
 */
import { userValidation } from "@/validations/user.validation";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { uploadAvatar } from "@/middlewares/upload.middleware";

const userRouter = Router();

userRouter.get("/me", authenticate, userController.getMe);
userRouter.patch(
  "/me",
  authenticate,
  uploadAvatar,
  validate(userValidation.updateProfileSchema),
  userController.updateProfile,
);
userRouter.patch(
  "/me/password",
  authenticate,
  validate(userValidation.updatePasswordSchema),
  userController.changePassword,
);
userRouter.get(
  "/me/vehicles",
  authenticate,
  validate(userValidation.getMyVehicles),
  userController.getMyVehicles,
);
userRouter.get(
  "/me/batteries",
  authenticate,
  validate(userValidation.getMyBatteries),
  userController.getMyBatteries,
);
userRouter.get(
  "/:sellerId/profile",
  validate(userValidation.getSellerProfileSchema),
  userController.getSellerProfile,
);

export default userRouter;
