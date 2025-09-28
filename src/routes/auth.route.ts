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

const authRouter = Router();

authRouter.post("/login", validate(authValidation.login), authController.login);

authRouter.post(
  "/register",
  validate(authValidation.register),
  authController.register,
);

authRouter.post("/refresh-token", authController.refreshToken);

authRouter.post("/logout", authenticate, authController.logout);

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
    const { accessToken, refreshToken } = generateTokens(user.id);
    setTokenCookie(
      res,
      "refreshToken",
      refreshToken,
      "/api/v1/auth/refresh-token",
    );
    res.json({ message: "OAuth login success", data: { user, accessToken } });
  },
);

authRouter.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"], session: false }),
);

authRouter.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: "/auth/login",
  }),
  (req, res) => {
    const user = req.user as any;
    const { accessToken, refreshToken } = generateTokens(user.id);
    setTokenCookie(
      res,
      "refreshToken",
      refreshToken,
      "/api/v1/auth/refresh-token",
    );
    res.json({ message: "OAuth login success", data: { user, accessToken } });
  },
);

export default authRouter;
