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
import { batteryService } from "@/services/battery.service";

/**
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Validations
 */
import { GetBatteriesQuery } from "@/validations/battery.validation";

export const batteryController = {
  createBattery: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const files = req.files as Express.Multer.File[];
    const battery = await batteryService.createBattery(
      userId,
      req.validated?.body,
      files,
    );
    res.status(STATUS_CODE.CREATED).json({
      message: "Battery created successfully",
      data: { battery },
    });
  }),
  getBatteries: asyncHandler(async (req, res) => {
    const query = req.validated?.query as GetBatteriesQuery;
    const filter = pick(query, ["brand"]);
    const options = pick(query, ["sortBy", "limit", "page"]);
    const result = await batteryService.queryBatteries(filter, options);
    res.status(STATUS_CODE.OK).json({
      message: "Batteries fetched successfully",
      data: result,
    });
  }),
  getBattery: asyncHandler(async (req, res) => {
    const battery = await batteryService.getBatteryById(
      req.validated?.params.batteryId,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Battery fetched successfully",
      data: { battery },
    });
  }),
  updateBattery: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { batteryId } = req.validated?.params;
    const files = req.files as Express.Multer.File[];
    const battery = await batteryService.updateBatteryById(
      batteryId,
      userId,
      req.validated?.body,
      files,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Battery updated successfully",
      data: { battery },
    });
  }),
  deleteBattery: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { batteryId } = req.validated?.params;
    await batteryService.deleteBatteryById(batteryId, userId);
    res.status(STATUS_CODE.OK).json({
      message: "Delete battery successfully",
    });
  }),
};
