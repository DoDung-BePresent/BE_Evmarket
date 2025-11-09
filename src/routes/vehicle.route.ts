/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { vehicleController } from "@/controllers/vehicle.controller";

/**
 * Validations
 */
import { vehicleValidation } from "@/validations/vehicle.validation";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { uploadImages } from "@/middlewares/upload.middleware";

const vehicleRouter = Router();

vehicleRouter.post(
  "/",
  authenticate,
  uploadImages,
  validate(vehicleValidation.createVehicle),
  vehicleController.createVehicle,
);

vehicleRouter.get(
  "/",
  validate(vehicleValidation.getVehicles),
  vehicleController.getVehicles,
);

vehicleRouter.get(
  "/:vehicleId",
  validate(vehicleValidation.getVehicle),
  vehicleController.getVehicle,
);

vehicleRouter.patch(
  "/:vehicleId",
  authenticate,
  uploadImages,
  validate(vehicleValidation.updateVehicle),
  vehicleController.updateVehicle,
);

vehicleRouter.delete(
  "/:vehicleId",
  authenticate,
  validate(vehicleValidation.deleteVehicle),
  vehicleController.deleteVehicle,
);

export default vehicleRouter;
