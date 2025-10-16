/* eslint-disable no-unsafe-optional-chaining */
/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { reviewService } from "@/services/review.service";

export const reviewController = {
  createReview: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { transactionId } = req.validated?.params;
    const files = req.files as {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
    };
    const review = await reviewService.createReview(
      userId,
      transactionId,
      req.validated?.body,
      files,
    );

    res.status(STATUS_CODE.CREATED).json({
      message: "Review created successfully",
      data: { review },
    });
  }),
  updateReview: asyncHandler(async (req, res) => {
    const { id: userId } = req.user!;
    const { reviewId } = req.validated?.params;
    const files = req.files as {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
    };
    const review = await reviewService.updateReview(
      userId,
      reviewId,
      req.validated?.body,
      files,
    );
    res.status(STATUS_CODE.OK).json({
      message: "Review updated successfully",
      data: { review },
    });
  }),
};
