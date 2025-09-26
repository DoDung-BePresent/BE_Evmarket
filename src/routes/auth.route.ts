/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { authController } from "@/controllers/auth.controller";

/**
 * Middlewares
 */
import { validate } from "@/middlewares/validate.middleware";

/**
 * Validations
 */
import { authValidation } from "@/validations/auth.validation";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/login", validate(authValidation.login), authController.login);

authRouter.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);

authRouter.post("/refresh-token", authController.refreshToken);

authRouter.post("/logout", authenticate, authController.logout);

export default authRouter;
