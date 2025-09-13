import { asyncHandler } from "@/middlewares/error.middleware";

export const authController = {
  register: asyncHandler(async (req, res) => {}),
  login: asyncHandler(async (req, res) => {}),
  logout: asyncHandler(async (req, res) => {}),
  refreshToken: asyncHandler(async (req, res) => {}),
};
