/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

export const userController = {
  getMe: asyncHandler(async (req, res) => {}),
  updateProfile: asyncHandler(async (req, res) => {}),
  updatePassword: asyncHandler(async (req, res) => {}),
};
