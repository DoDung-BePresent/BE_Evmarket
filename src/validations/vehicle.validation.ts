/**
 * Node modules
 */
import z from "zod";

const getVehiclesSchema = z.object({
  query: z.object({
    brand: z.string().optional(),
    sortBy: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export type GetVehiclesQuery = z.infer<typeof getVehiclesSchema>["query"];

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
