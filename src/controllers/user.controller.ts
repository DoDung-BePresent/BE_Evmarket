/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

export const userController = {
  getMe: asyncHandler(async (req, res) => {
    const user = req.user!;

    res.status(STATUS_CODE.OK).json({
      message: "Profile fetched successfully",
      data: {
        user,
      },
    });
  }),
};
