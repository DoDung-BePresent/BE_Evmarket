/**
 * Node modules
 */
import z from "zod";

export const reviewValidation = {
  createReview: z.object({
    body: z.object({
      rating: z.coerce.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    }),
    params: z.object({
      transactionId: z.uuid(),
    }),
  }),
  updateReview: z.object({
    body: z.object({
      rating: z.coerce.number().int().min(1).max(5).optional(),
      comment: z.string().max(500).optional(),
    }),
    params: z.object({
      reviewId: z.cuid(),
    }),
  }),
};
