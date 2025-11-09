/**
 * Node modules
 */
import { Router } from "express";

/**
 * Validations
 */
import { reviewValidation } from "@/validations/review.validation";

/**
 * Controllers
 */
import { reviewController } from "@/controllers/review.controller";

/**
 * Middlewares
 */
import { authenticate } from "@/middlewares/auth.middleware";
import { validate } from "@/middlewares/validate.middleware";
import { uploadReviewMedia } from "@/middlewares/upload.middleware";

const reviewRouter = Router();

reviewRouter.post(
  "/:transactionId",
  authenticate,
  uploadReviewMedia,
  validate(reviewValidation.createReview),
  reviewController.createReview,
);

reviewRouter.patch(
  "/:reviewId",
  authenticate,
  uploadReviewMedia,
  validate(reviewValidation.updateReview),
  reviewController.updateReview,
);

export default reviewRouter;
