/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Utils
 */
import { pick } from "@/utils/pick.util";

/**
 * Services
 */
import { vehicleService } from "@/services/vehicle.service";

/**
 * Validations
 */
import { GetVehiclesQuery } from "@/validations/vehicle.validation";

export const vehicleController = {
  createVehicle: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const files = req.files as Express.Multer.File[];
    const vehicle = await vehicleService.createVehicle(
      userId,
      req.validated?.body,
      files,
    );
    res.status(STATUS_CODE.CREATED).json({
      message: "Vehicle created successfully",
      data: { vehicle },
    });
  }),
  getVehicles: asyncHandler(async (req, res) => {
    const query = req.validated?.query as GetVehiclesQuery;

    const filter = pick(query, ["brand"]);
    const options = pick(query, ["sortBy", "limit", "page"]);
    const result = await vehicleService.queryVehicles(filter, options);
    res.status(STATUS_CODE.OK).json({
      message: "Vehicles fetched successfully",
      data: result,
    });
  }),
  getVehicle: asyncHandler(async (req, res) => {
    const vehicle = await vehicleService.getVehicleById(
      req.validated?.params.vehicleId,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Vehicle fetched successfully",
      data: { vehicle },
    });
  }),
};
