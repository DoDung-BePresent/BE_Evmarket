import z from "zod";

const BatterySchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(5000),
  price: z.coerce.number().positive(),
  brand: z.string().min(2),
  capacity: z.coerce.number().positive(),
  health: z.coerce.number().min(0).max(100).optional(),
});

const getBatteriesSchema = z.object({
  query: z.object({
    brand: z.string().optional(),
    sortBy: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const batteryValidation = {
  createBattery: z.object({
    body: BatterySchema,
  }),
  getBatteries: getBatteriesSchema,
  getBattery: z.object({
    params: z.object({
      batteryId: z.string().cuid(),
    }),
  }),
};

export type GetBatteriesQuery = z.infer<typeof getBatteriesSchema>["query"];
