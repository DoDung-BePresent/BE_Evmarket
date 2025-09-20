/**
 * Express
 */
import { NextFunction, Request, Response } from "express";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { verifyToken } from "@/libs/jwt";
import { UnauthorizedError } from "@/libs/error";

/**
 * Configs
 */
import config from "@/configs/env.config";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(new UnauthorizedError("Authentication token is required"));
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token, config.JWT_ACCESS_SECRET);

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user) {
      return next(new UnauthorizedError("User not found for this token"));
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return next(
        new UnauthorizedError("Your session has expired. Please login again."),
      );
    }
    if (error.name === "JsonWebTokenError") {
      return next(new UnauthorizedError("Invalid authentication token"));
    }
    if (error.name === "NotBeforeError") {
      return next(new UnauthorizedError("Token not yet valid"));
    }

    next(new UnauthorizedError("Authentication failed"));
  }
};
