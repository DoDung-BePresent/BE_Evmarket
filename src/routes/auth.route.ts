/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { authController } from "@/controllers/auth.controller";

const authRouter = Router();

authRouter.post("/login", authController.login);
authRouter.post("/register", authController.register);
authRouter.post("/refresh-token", authController.refreshToken);
authRouter.post("/logout", authController.logout);

export default authRouter;
