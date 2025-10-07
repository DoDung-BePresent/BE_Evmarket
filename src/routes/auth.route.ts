/**
 * Node modules
 */
import { Router } from "express";
import passport from "passport";

/**
 * Libs
 */
import { generateTokens, setTokenCookie } from "@/libs/jwt";

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
import config from "@/configs/env.config";

const authRouter = Router();

authRouter.post("/login", validate(authValidation.login), authController.login);

authRouter.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);

authRouter.post("/refresh-token", authController.refreshToken);

authRouter.post("/logout", authenticate, authController.logout);

authRouter.post(
  "/google/mobile",
  validate(authValidation.googleMobileLogin),
  authController.googleMobileLogin,
);

authRouter.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/login",
  }),
  (req, res) => {
    const user = req.user as any;
    const { refreshToken, accessToken } = generateTokens(user.id);
    setTokenCookie(
      res,
      "refreshToken",
      refreshToken,
      "/api/v1/auth/refresh-token",
    );
    return res.redirect(
      `${config.CLIENT_URL}/auth/success?accessToken=${accessToken}`,
    );
  },
);

export default authRouter;
