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

/**
 * @openapi
 * /api/v1/batteries:
 *   post:
 *     tags:
 *       - Battery
 *     summary: Create a new battery listing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/BatteryBody'
 *     responses:
 *       201:
 *         description: Battery listing created successfully
 *       400:
 *         description: Bad request (validation error)
 *       401:
 *         description: Unauthorized
 */
batteryRouter.post(
  "/",
  authenticate,
  uploadImages,
  validate(batteryValidation.createBattery),
  batteryController.createBattery,
);

/**
 * @openapi
 * /api/v1/batteries:
 *   get:
 *     tags:
 *       - Battery
 *     summary: Get all battery listings
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
 *         description: Maximum number of batteries
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
 *               $ref: '#/components/schemas/BatteryListResponse'
 */
batteryRouter.get(
  "/",
  validate(batteryValidation.getBatteries),
  batteryController.getBatteries,
);

/**
 * @openapi
 * /api/v1/batteries/{batteryId}:
 *   get:
 *     tags:
 *       - Battery
 *     summary: Get a single battery listing by ID
 *     parameters:
 *       - in: path
 *         name: batteryId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the battery
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Battery'
 *       404:
 *         description: Battery not found
 */
batteryRouter.get(
  "/:batteryId",
  validate(batteryValidation.getBattery),
  batteryController.getBattery,
);

export default batteryRouter;
