/**
 * Node modules
 */
import { Router } from "express";
import passport from "passport";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Libs
 */
import { generateTokens, setTokenCookie } from "@/libs/jwt";

/**
 * Controllers
 */
import { authController } from "@/controllers/auth.controller";

/**
 * Services
 */
import { authService } from "@/services/auth.service";

/**
 * Middlewares
 */
import { validate } from "@/middlewares/validate.middleware";
import { authenticate } from "@/middlewares/auth.middleware";
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Validations
 */
import { authValidation } from "@/validations/auth.validation";

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

authRouter.get("/google", (req, res, next) => {
  const clientType = req.query.client_type === "mobile" ? "mobile" : "web";
  const state = Buffer.from(JSON.stringify({ clientType })).toString("base64");

  const authenticator = passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    state: state,
  });

  authenticator(req, res, next);
});

authRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/auth/login",
  }),
  asyncHandler(async (req, res) => {
    const user = req.user as any;
    let clientType = "web";

    if (req.query.state) {
      try {
        const state = JSON.parse(
          Buffer.from(req.query.state as string, "base64").toString("utf-8"),
        );
        clientType = state.clientType === "mobile" ? "mobile" : "web";
      } catch (error) {
        console.error("Invalid state parameter:", error);
      }
    }

    if (clientType === "mobile") {
      const code = await authService.createOneTimeCode(user.id);
      const redirectUrl = `evmarket://auth-callback?code=${code}`;
      return res.redirect(redirectUrl);
    } else {
      const { accessToken, refreshToken } = generateTokens(user.id);
      setTokenCookie(
        res,
        "refreshToken",
        refreshToken,
        "/api/v1/auth/refresh-token",
      );
      return res.redirect(
        `${config.CLIENT_URL}/auth/success?accessToken=${accessToken}`,
      );
    }
  }),
);

authRouter.post(
  "/exchange-code",
  validate(authValidation.exchangeCode),
  authController.exchangeCodeForTokens,
);

export default authRouter;
