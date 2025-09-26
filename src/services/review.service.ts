/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { supabase } from "@/libs/supabase";
import { compressImage, compressVideo } from "@/libs/compress";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/libs/error";

export const reviewService = {
  createReview: async (
    userId: string,
    transactionId: string,
    payload: { rating: number; comment?: string },
    files?: {
      images?: Express.Multer.File[];
      video?: Express.Multer.File[];
    },
  ) => {
    const transaction = await prisma.transaction.findUnique({
      where: {
        id: transactionId,
      },
      include: {
        review: true,
      },
    });

    if (!transaction) throw new NotFoundError("Transaction not found");
    if (transaction.status !== "COMPLETED")
      throw new ForbiddenError("You can only review completed transactions");
    if (transaction.buyerId !== userId)
      throw new ForbiddenError("You are not the buyer of this transaction");
    if (transaction.review)
      throw new BadRequestError("Review already exists for this transaction");

    const mediaUrls: string[] = [];
    // TODO: manage all bucket in config
    const uploadedFiles: { bucket: string; path: string }[] = [];

    try {
      if (files?.images) {
        for (const file of files.images) {
          const buffer = await compressImage(file.buffer, {
            width: 800,
            format: "webp",
            quality: 80,
          });
          const fileName = `reviews/${transactionId}/images/${Date.now()}-${file.originalname}.webp`;
          const { error } = await supabase.storage
            .from("reviews")
            .upload(fileName, buffer, {
              contentType: "image/webp",
            });
          if (error) throw new BadRequestError("Failed to upload image");
          uploadedFiles.push({ bucket: "reviews", path: fileName });
          const { data } = supabase.storage
            .from("reviews")
            .getPublicUrl(fileName);
          mediaUrls.push(data.publicUrl);
        }
      }

      if (files?.video && files.video.length > 0) {
        const file = files.video[0];
        const buffer = await compressVideo(file.buffer, {
          format: "mp4",
          maxBitrate: 1200,
          maxSizeMB: 20,
        });
        const fileName = `reviews/${transactionId}/video/${Date.now()}-${file.originalname}.mp4`;
        const { error } = await supabase.storage
          .from("reviews")
          .upload(fileName, buffer, {
            contentType: "video/mp4",
          });
        if (error) throw new BadRequestError("Failed to upload video");
        uploadedFiles.push({ bucket: "reviews", path: fileName });
        const { data } = supabase.storage
          .from("reviews")
          .getPublicUrl(fileName);
        mediaUrls.push(data.publicUrl);
      }

      const review = await prisma.review.create({
        data: {
          rating: payload.rating,
          comment: payload.comment,
          mediaUrls,
          transaction: {
            connect: {
              id: transactionId,
            },
          },
          reviewer: {
            connect: {
              id: userId,
            },
          },
        },
      });
      return review;
    } catch (_error) {
      for (const file of uploadedFiles) {
        await supabase.storage.from(file.bucket).remove([file.path]);
      }
      throw new BadRequestError(
        "Upload failed, all uploaded files have been removed",
      );
    }
  },
  updateReview: async (
    userId: string,
    reviewId: string,
    payload: { rating?: number; comment?: string },
    files: { images?: Express.Multer.File[]; video?: Express.Multer.File[] },
  ) => {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });
    if (!review) throw new NotFoundError("Review not found");
    if (review.reviewerId !== userId)
      throw new ForbiddenError("You are not the author of this review");
    if (review.hasBeenEdited)
      throw new BadRequestError("Review can only be edited once");

    // TODO: case remove image or video?
    const mediaUrls: string[] = [];
    const uploadedFiles: { bucket: string; path: string }[] = [];

    try {
      if (files?.images) {
        for (const file of files.images) {
          const buffer = await compressImage(file.buffer, {
            width: 800,
            format: "webp",
            quality: 80,
          });
          const fileName = `reviews/${review.transactionId}/images/${Date.now()}-${file.originalname}.webp`;
          const { error } = await supabase.storage
            .from("reviews")
            .upload(fileName, buffer, {
              contentType: "image/webp",
            });
          if (error) throw new BadRequestError("Failed to upload image");
          uploadedFiles.push({ bucket: "reviews", path: fileName });
          const { data } = supabase.storage
            .from("reviews")
            .getPublicUrl(fileName);
          mediaUrls.push(data.publicUrl);
        }
      }
      if (files?.video && files.video.length > 0) {
        const file = files.video[0];
        const buffer = await compressVideo(file.buffer, {
          format: "mp4",
          maxBitrate: 1200,
          maxSizeMB: 20,
        });
        const fileName = `reviews/${review.transactionId}/video/${Date.now()}-${file.originalname}.mp4`;
        const { error } = await supabase.storage
          .from("reviews")
          .upload(fileName, buffer, {
            contentType: "video/mp4",
          });
        if (error) throw new BadRequestError("Failed to upload video");
        uploadedFiles.push({ bucket: "reviews", path: fileName });
        const { data } = supabase.storage
          .from("reviews")
          .getPublicUrl(fileName);
        mediaUrls.push(data.publicUrl);
      }

      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          rating: payload.rating ?? review.rating,
          comment: payload.comment ?? review.comment,
          mediaUrls: mediaUrls.length > 0 ? mediaUrls : review.mediaUrls,
          hasBeenEdited: true,
        },
      });
      return updatedReview;
    } catch (_error) {
      for (const file of uploadedFiles) {
        await supabase.storage.from(file.bucket).remove([file.path]);
      }
      throw new BadRequestError(
        "Upload failed, all uploaded files have been removed",
      );
    }
  },
};
