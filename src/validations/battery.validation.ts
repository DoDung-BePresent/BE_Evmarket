/**
 * Node modules
 */
import z from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     BatteryBody:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *         - brand
 *         - capacity
 *       properties:
 *         title:
 *           type: string
 *           description: Battery listing title
 *           example: "BYD 100kWh EV Battery Pack"
 *         description:
 *           type: string
 *           description: Detailed description of the battery
 *           example: "High-performance BYD battery pack suitable for electric vehicles. Excellent condition, 96% health."
 *         price:
 *           type: number
 *           description: Listing price in USD
 *           example: 23000
 *         brand:
 *           type: string
 *           description: Battery brand
 *           example: "BYD"
 *         capacity:
 *           type: number
 *           description: Battery capacity in kWh
 *           example: 100
 *         health:
 *           type: number
 *           description: Battery health percentage (optional)
 *           example: 96
 *     Battery:
 *       allOf:
 *         - $ref: '#/components/schemas/BatteryBody'
 *         - type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "cmftk8gsj0031th94t4jx57zu"
 *             images:
 *               type: array
 *               items:
 *                 type: string
 *                 format: uri
 *               example: ["https://placehold.co/600x400?text=battery_1", "https://placehold.co/600x400?text=battery_2"]
 *             status:
 *               type: string
 *               enum: [AVAILABLE, SOLD, DELISTED]
 *               example: "AVAILABLE"
 *             isVerified:
 *               type: boolean
 *               example: true
 *             createdAt:
 *               type: string
 *               format: date-time
 *             updatedAt:
 *               type: string
 *               format: date-time
 *             seller:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "clx987zyx654cba321"
 *                 name:
 *                   type: string
 *                   example: "Jane Smith"
 *                 avatar:
 *                   type: string
 *                   format: uri
 *                   example: "https://i.pravatar.cc/150"
 *     BatteryListResponse:
 *       type: object
 *       properties:
 *         batteries:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Battery'
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 2
 *         totalResults:
 *           type: integer
 *           example: 20
 */
export const batteryValidation = {
  createBattery: z.object({
    body: z.object({
      title: z.string().min(5).max(100),
      description: z.string().min(20).max(5000),
      price: z.coerce.number().positive(),
      brand: z.string().min(2),
      capacity: z.coerce.number().positive(),
      health: z.coerce.number().min(0).max(100).optional(),
    }),
  }),
  getBatteries: z.object({
    query: z.object({
      brand: z.string().optional(),
      sortBy: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  getBattery: z.object({
    params: z.object({
      batteryId: z.string().cuid(),
    }),
  }),
};

export type GetBatteriesQuery = z.infer<
  typeof batteryValidation.getBatteries
>["query"];
