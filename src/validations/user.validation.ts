import { z } from "zod";

export const userValidation = {
  getMyVehicles: z.object({
    query: z.object({
      brand: z.string().optional(),
      sortBy: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  getMyBatteries: z.object({
    query: z.object({
      brand: z.string().optional(),
      sortBy: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    }),
  }),
  updateProfileSchema: z.object({
    body: z.object({
      name: z.string().trim().min(1, "Name cannot be empty.").optional(),
      removeAvatar: z.enum(["true"]).optional(),
    }),
  }),
  updatePasswordSchema: z.object({
    body: z
      .object({
        currentPassword: z.string().min(1, "Current password is required."),
        newPassword: z
          .string()
          .min(8, "New password must be at least 8 characters long."),
        confirmPassword: z.string(),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: "New passwords do not match.",
        path: ["confirmPassword"],
      }),
  }),
  getSellerProfileSchema: z.object({
    params: z.object({
      sellerId: z.cuid(),
    }),
  }),
};
