/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { userService } from "@/services/user.service";
import { batteryService } from "@/services/battery.service";
import { vehicleService } from "@/services/vehicle.service";

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
  getMyVehicles: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const options = pick(req.query, ["sortBy", "limit", "page"]);
    const result = await vehicleService.getVehiclesBySellerId(userId, options);
    res.status(STATUS_CODE.OK).json({
      message: "My vehicles fetched successfully",
      data: result,
    });
  }),
  getMyBatteries: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const options = pick(req.query, ["sortBy", "limit", "page"]);
    const result = await batteryService.getBatteriesBySellerId(userId, options);
    res.status(STATUS_CODE.OK).json({
      message: "My batteries fetched successfully",
      data: result,
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
