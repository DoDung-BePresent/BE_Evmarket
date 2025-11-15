import { z } from "zod";

export const appointmentValidation = {
  proposeDate: z.object({
    params: z.object({
      appointmentId: z.cuid(),
    }),
    body: z.object({
      // Ngày phải ở định dạng ISO 8601 và trong tương lai
      proposedDate: z
        .string()
        .datetime({ message: "Invalid date format. Must be ISO 8601 string." })
        .refine((date) => new Date(date) > new Date(), {
          message: "Proposed date must be in the future.",
        }),
    }),
  }),
  confirmDate: z.object({
    params: z.object({
      appointmentId: z.string().cuid(),
    }),
  }),
  getAppointments: z.object({
    query: z.object({
      page: z.coerce.number().int().positive().optional(),
      limit: z.coerce.number().int().positive().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
  }),
};