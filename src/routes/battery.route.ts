/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { batteryController } from "@/controllers/battery.controller";

/**
 * Validations
 */
import { batteryValidation } from "@/validations/battery.validation";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { uploadImages } from "@/middlewares/upload.middleware";

const batteryRouter = Router();

batteryRouter.post(
  "/",
  authenticate,
  uploadImages,
  validate(batteryValidation.createBattery),
  batteryController.createBattery,
);

batteryRouter.get(
  "/",
  validate(batteryValidation.getBatteries),
  batteryController.getBatteries,
);

batteryRouter.get(
  "/:batteryId",
  validate(batteryValidation.getBattery),
  batteryController.getBattery,
);

batteryRouter.patch(
  "/:batteryId",
  authenticate,
  uploadImages,
  validate(batteryValidation.updateBattery),
  batteryController.updateBattery,
);

batteryRouter.delete(
  "/:batteryId",
  authenticate,
  validate(batteryValidation.deleteBattery),
  batteryController.deleteBattery,
);

export default batteryRouter;
