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

const userRouter = Router();

userRouter.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags:
 *       - User
 *     summary: Get current user's profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
userRouter.get("/me", userController.getMe);

export default userRouter;
