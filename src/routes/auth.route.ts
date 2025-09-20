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

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log in a user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login successfully
 *       400:
 *         description: Invalid email or password
 */
authRouter.post("/login", validate(authValidation.login), authController.login);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBody'
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
authRouter.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access token
 *     description: Requires refreshToken to be sent in an httpOnly cookie.
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Refresh token not found or invalid
 */
authRouter.post("/refresh-token", authController.refreshToken);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Log out a user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
authRouter.post("/logout", authenticate, authController.logout);

export default authRouter;
