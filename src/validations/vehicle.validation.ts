/* eslint-disable @typescript-eslint/no-unused-vars */
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
      specifications: z.preprocess(
        (val) => {
          if (typeof val === "string") {
            try {
              return JSON.parse(val);
            } catch (_error) {
              return val; // Return original value to fail validation
            }
          }
          return val;
        },
        z.object({
          performance: z
            .object({
              topSpeed: z.string(),
              acceleration: z.string(),
              motorType: z.string(),
              horsepower: z.string(),
            })
            .partial(),
          dimensions: z
            .object({
              length: z.string(),
              width: z.string(),
              height: z.string(),
              curbWeight: z.string(),
            })
            .partial(),
          batteryAndCharging: z
            .object({
              batteryCapacity: z.string(),
              range: z.string(),
              chargingSpeed: z.string(),
              chargeTime: z.string(),
            })
            .partial(),
          warranty: z
            .object({
              basic: z.string(),
              battery: z.string(),
              drivetrain: z.string(),
            })
            .partial(),
        }),
      ),
      isAuction: z.coerce.boolean().optional(),
      auctionEndsAt: z.coerce.date().optional(),
      startingPrice: z.coerce.number().positive().optional(),
      bidIncrement: z.coerce.number().positive().optional(),
      depositAmount: z.coerce.number().positive().optional(),
    }),
  }),
  updateVehicle: z.object({
    params: z.object({
      vehicleId: z.string().cuid(),
    }),
    body: z
      .object({
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
        specifications: z.any(), // Simplified for update
        imagesToDelete: z
          .preprocess((val) => {
            if (typeof val === "string") {
              try {
                return JSON.parse(val);
              } catch (_e) {
                return val;
              }
            }
            return val;
          }, z.array(z.string().url()))
          .optional(),
      })
      .partial(), // Make all fields optional
  }),
  deleteVehicle: z.object({
    params: z.object({
      vehicleId: z.string().cuid(),
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
