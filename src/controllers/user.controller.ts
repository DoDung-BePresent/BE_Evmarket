/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { userService } from "@/services/user.service";

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
  getSellerProfile: asyncHandler(async (req, res) => {
    const { sellerId } = req.validated?.params;
    const data = await userService.getSellerProfileWithReviews(sellerId);
    res.status(STATUS_CODE.OK).json({
      message: "Seller profile fetched successfully",
      data,
    });
  }),
};
