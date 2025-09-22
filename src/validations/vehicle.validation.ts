/**
 * Node modules
 */
import z from "zod";

/**
 * @openapi
 * components:
 *   schemas:
 *     VehicleBody:
 *       type: object
 *       required:
 *         - title
 *         - description
 *         - price
 *         - brand
 *         - model
 *         - year
 *         - mileage
 *       properties:
 *         title:
 *           type: string
 *           description: Vehicle listing title
 *           example: "2023 Tesla Model S"
 *         description:
 *           type: string
 *           description: Detailed description of the vehicle
 *           example: "Tesla Model S, 2023, excellent condition, low mileage, full options."
 *         price:
 *           type: number
 *           description: Listing price in USD
 *           example: 120000
 *         brand:
 *           type: string
 *           description: Vehicle brand
 *           example: "Tesla"
 *         model:
 *           type: string
 *           description: Vehicle model
 *           example: "Model S"
 *         year:
 *           type: integer
 *           description: Year of manufacture
 *           example: 2023
 *         mileage:
 *           type: integer
 *           description: Mileage in kilometers
 *           example: 15000
 *     Vehicle:
 *       allOf:
 *         - $ref: '#/components/schemas/VehicleBody'
 *         - type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "clx123abc456def789"
 *             images:
 *               type: array
 *               items:
 *                 type: string
 *                 format: uri
 *               example: ["https://placehold.co/600x400?text=vehicle_1", "https://placehold.co/600x400?text=vehicle_2"]
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
 *                   example: "John Doe"
 *                 avatar:
 *                   type: string
 *                   format: uri
 *                   example: "https://i.pravatar.cc/150"
 *     VehicleListResponse:
 *       type: object
 *       properties:
 *         vehicles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Vehicle'
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 5
 *         totalResults:
 *           type: integer
 *           example: 48
 */
export const vehicleValidation = {
  createVehicle: z.object({
    body: z.object({
      title: z.string().min(5).max(100),
      description: z.string().min(20).max(5000),
      price: z.coerce.number().positive(),
      brand: z.string().min(2),
      model: z.string().min(1),
      year: z.coerce
        .number()
        .int()
        .min(1990)
        .max(new Date().getFullYear() + 1),
      mileage: z.coerce.number().int().min(0),
    }),
  }),
  getVehicles: z.object({
    query: z.object({
      brand: z.string().optional(),
      sortBy: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  getVehicle: z.object({
    params: z.object({
      vehicleId: z.string().cuid(),
    }),
  }),
};

export type GetVehiclesQuery = z.infer<
  typeof vehicleValidation.getVehicles
>["query"];
