import { z } from "zod";

export const appointmentValidation = {
  proposeDate: z.object({
    params: z.object({
      appointmentId: z.cuid(),
    }),
    body: z.object({
      // Ngày phải ở định dạng ISO 8601 và trong tương lai
      proposedDates: z
        .array(
          z
            .string()
            .datetime({
              offset: true,
              message:
                "Invalid date format. Must be ISO 8601 string with timezone.",
            })
            .refine((date) => new Date(date) > new Date(), {
              message: "Proposed date must be in the future.",
            }),
        )
        .min(1, "At least one date must be proposed."),
    }),
  }),
  confirmDate: z.object({
    params: z.object({
      appointmentId: z.string().cuid(),
    }),
    body: z.object({
      confirmedDate: z.string().datetime({
        offset: true,
        message: "Invalid date format. Must be ISO 8601 string with timezone.",
      }),
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
