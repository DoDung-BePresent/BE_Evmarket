/**
 * Node modules
 */
import z from "zod";

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
      specifications: z
        .preprocess(
          (val) => {
            if (typeof val === "string") {
              try {
                return JSON.parse(val);
              } catch (error) {
                return val; // Return original value to fail validation
              }
            }
            return val;
          },
          z.object({
            performance: z
              .object({
                topSpeed: z.string().optional(),
                acceleration: z.string().optional(),
                motorType: z.string().optional(),
                horsepower: z.string().optional(),
              })
              .optional(),
            dimensions: z
              .object({
                length: z.string().optional(),
                width: z.string().optional(),
                height: z.string().optional(),
                curbWeight: z.string().optional(),
              })
              .optional(),
            batteryAndCharging: z
              .object({
                batteryCapacity: z.string().optional(),
                range: z.string().optional(),
                chargingSpeed: z.string().optional(),
                chargeTime: z.string().optional(),
              })
              .optional(),
            warranty: z
              .object({
                basic: z.string().optional(),
                battery: z.string().optional(),
                drivetrain: z.string().optional(),
              })
              .optional(),
          }),
        )
        .optional(),
      isAuction: z.coerce.boolean().optional(),
      auctionEndsAt: z.coerce.date().optional(),
      startingPrice: z.coerce.number().positive().optional(),
      bidIncrement: z.coerce.number().positive().optional(),
      depositAmount: z.coerce.number().positive().optional(),
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
