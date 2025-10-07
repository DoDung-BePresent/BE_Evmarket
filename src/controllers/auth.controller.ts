/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { authService } from "@/services/auth.service";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { UnauthorizedError } from "@/libs/error";
import {
  clearTokenCookie,
  generateTokens,
  setTokenCookie,
  verifyToken,
} from "@/libs/jwt";

// TODO: Remove validations in this controller!
export const authController = {
  register: asyncHandler(async (req, res) => {
    const user = await authService.register(req.validated?.body);

    const { accessToken, refreshToken } = generateTokens(user.id);

    setTokenCookie(
      res,
      "refreshToken",
      refreshToken,
      "/api/v1/auth/refresh-token",
    );

    res.status(STATUS_CODE.CREATED).json({
      message: "User created successfully",
      data: {
        user,
        accessToken,
      },
    });
  }),
  login: asyncHandler(async (req, res) => {
    const user = await authService.login(req.validated?.body);

    const { accessToken, refreshToken } = generateTokens(user.id);

    setTokenCookie(
      res,
      "refreshToken",
      refreshToken,
      "/api/v1/auth/refresh-token",
    );

    res.status(STATUS_CODE.OK).json({
      message: "Login successfully",
      data: {
        user,
        accessToken,
      },
    });
  }),
  logout: asyncHandler(async (_req, res) => {
    clearTokenCookie(res, "refreshToken", "/api/v1/auth/refresh-token");
    res.status(STATUS_CODE.OK).json({
      message: "Logged out successfully",
    });
  }),
  refreshToken: asyncHandler(async (req, res) => {
    const refreshTokenFromCookie = req.cookies.refreshToken;
    if (!refreshTokenFromCookie) {
      throw new UnauthorizedError("Refresh token not found");
    }

    const decoded = verifyToken(
      refreshTokenFromCookie,
      config.JWT_REFRESH_SECRET,
    );

    const userExists = await prisma.user.count({
      where: { id: decoded.userId },
    });

    if (!userExists) {
      throw new UnauthorizedError("User for this token no longer exists");
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      decoded.userId,
    );

    setTokenCookie(
      res,
      "refreshToken",
      newRefreshToken,
      "/api/v1/auth/refresh-token",
    );

    res.status(STATUS_CODE.OK).json({
      message: "Token refreshed successfully",
      data: {
        accessToken,
      },
    });
  }),
  googleMobileLogin: asyncHandler(async (req, res) => {
    const { idToken } = req.validated?.body;
    const user = await authService.verifyGoogleIdToken(idToken);

    const { accessToken, refreshToken } = generateTokens(user.id);

    setTokenCookie(
      res,
      "refreshToken",
      refreshToken,
      "/api/v1/auth/refresh-token",
    );

    res.status(STATUS_CODE.OK).json({
      message: "Login with Google successfully",
      data: {
        user,
        accessToken,
      },
    });
  }),
};
