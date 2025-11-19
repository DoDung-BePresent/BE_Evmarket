import { STATUS_CODE } from "@/constants/error.constant";
import { asyncHandler } from "@/middlewares/error.middleware";
import { systemService } from "@/services/system.service";
import config from "@/configs/env.config";
import { ForbiddenError } from "@/libs/error";

export const systemController = {
  runTasks: asyncHandler(async (req, res) => {
    const secret = req.headers["x-cron-secret"];

    if (!secret || secret !== config.CRON_SECRET) {
      throw new ForbiddenError("Invalid or missing cron secret.");
    }

    const result = await systemService.runScheduledTasks();
    res.status(STATUS_CODE.OK).json({
      message: "Scheduled tasks executed successfully.",
      data: result,
    });
  }),
};
