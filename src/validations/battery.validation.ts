/**
 * Node modules
 */
import z from "zod";

export const batteryValidation = {
  createBattery: z.object({
    body: z.object({
      title: z.string().min(5).max(100),
      description: z.string().min(20).max(5000),
      price: z.coerce.number().positive(),
      brand: z.string().min(2),
      year: z.coerce
        .number()
        .int()
        .min(1990)
        .max(new Date().getFullYear() + 1),
      capacity: z.coerce.number().positive(),
      health: z.coerce.number().min(0).max(100).optional(),
      specifications: z.preprocess(
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
        z
          .object({
            weight: z.string(),
            voltage: z.string(),
            warrantyPeriod: z.string(),
            chargingTime: z.string(),
            chemistry: z.string(),
            temperatureRange: z.string(),
            degradation: z.string(),
            installation: z.string(),
          })
          .partial(),
      ),
      isAuction: z.coerce.boolean().optional(),
      auctionEndsAt: z.coerce.date().optional(),
      startingPrice: z.coerce.number().positive().optional(),
      bidIncrement: z.coerce.number().positive().optional(),
      depositAmount: z.coerce.number().positive().optional(),
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
  updateBattery: z.object({
    params: z.object({
      batteryId: z.string().cuid(),
    }),
    body: z
      .object({
        title: z.string().min(5).max(100),
        description: z.string().min(20).max(5000),
        price: z.coerce.number().positive(),
        brand: z.string().min(2),
        year: z.coerce
          .number()
          .int()
          .min(1990)
          .max(new Date().getFullYear() + 1),
        capacity: z.coerce.number().positive(),
        health: z.coerce.number().min(0).max(100).optional(),
        specifications: z.any(), // Simplified for update
        imagesToDelete: z
          .preprocess((val) => {
            if (typeof val === "string") {
              try {
                return JSON.parse(val);
              } catch (e) {
                return val;
              }
            }
            return val;
          }, z.array(z.string().url()))
          .optional(),
      })
      .partial(), // Make all fields optional
  }),
  deleteBattery: z.object({
    params: z.object({
      batteryId: z.string().cuid(),
    }),
  }),
};

export type GetBatteriesQuery = z.infer<
  typeof batteryValidation.getBatteries
>["query"];
