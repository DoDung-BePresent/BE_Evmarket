import { STATUS_CODE } from "@/constants/error.constant";
import { asyncHandler } from "@/middlewares/error.middleware";
import { batteryService } from "@/services/battery.service";
import { pick } from "@/utils/pick.util";
import { GetBatteriesQuery } from "@/validations/battery.validation";

export const batteryController = {
  createBattery: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const files = req.files as Express.Multer.File[];
    const battery = await batteryService.createBattery(userId, req.body, files);
    res.status(STATUS_CODE.CREATED).json({
      message: "Battery created successfully",
      data: { battery },
    });
  }),
  getBatteries: asyncHandler(async (req, res) => {
    const query = req.query as unknown as GetBatteriesQuery;
    const filter = pick(query, ["brand"]);
    const options = pick(query, ["sortBy", "limit", "page"]);
    const result = await batteryService.queryBatteries(filter, options);
    res.status(STATUS_CODE.OK).json({
      message: "Batteries fetched successfully",
      data: { result },
    });
  }),
  getBattery: asyncHandler(async (req, res) => {
    const battery = await batteryService.getBatteryById(req.params.batteryId);
    res.status(STATUS_CODE.OK).json({
      message: "Battery fetched successfully",
      data: { battery },
    });
  }),
};
