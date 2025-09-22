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

/**
 * @openapi
 * /api/v1/vehicles:
 *   post:
 *     tags:
 *       - Vehicle
 *     summary: Create a new vehicle listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/VehicleBody'
 *     responses:
 *       201:
 *         description: Vehicle listing created successfully
 *       400:
 *         description: Bad request (validation error)
 *       401:
 *         description: Unauthorized
 */
vehicleRouter.post(
  "/",
  authenticate,
  uploadImages,
  validate(vehicleValidation.createVehicle),
  vehicleController.createVehicle,
);

/**
 * @openapi
 * /api/v1/vehicles:
 *   get:
 *     tags:
 *       - Vehicle
 *     summary: Get all vehicle listings
 *     parameters:
 *       - in: query
 *         name: brand
 *         schema:
 *           type: string
 *         description: Filter by brand
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort by field (e.g., createdAt, price)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 10
 *         description: Maximum number of vehicles
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         default: 1
 *         description: Page number
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleListResponse'
 */
vehicleRouter.get(
  "/",
  validate(vehicleValidation.getVehicles),
  vehicleController.getVehicles,
);

/**
 * @openapi
 * /api/v1/vehicles/{vehicleId}:
 *   get:
 *     tags:
 *       - Vehicle
 *     summary: Get a single vehicle listing by ID
 *     parameters:
 *       - in: path
 *         name: vehicleId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the vehicle
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vehicle'
 *       404:
 *         description: Vehicle not found
 */
vehicleRouter.get(
  "/:vehicleId",
  validate(vehicleValidation.getVehicle),
  vehicleController.getVehicle,
);

export default vehicleRouter;
