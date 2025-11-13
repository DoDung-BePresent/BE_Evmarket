/**
 * Node modules
 */
import { User } from "@prisma/client";

/**
 * Constants
 */
import { SUPABASE_BUCKETS } from "@/constants/supabase.constant";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import logger from "@/libs/logger";
import { supabase } from "@/libs/supabase";
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "@/libs/error";
import { comparePassword, hashPassword } from "@/libs/crypto";

export const userService = {
  getUserById: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },
  getSellerProfileWithReviews: async (sellerId: string) => {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        avatar: true,
        email: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!seller) throw new NotFoundError("Seller not found");

    const vehicles = await prisma.vehicle.findMany({
      where: { sellerId },
      select: { id: true, title: true },
    });
    const batteries = await prisma.battery.findMany({
      where: { sellerId },
      select: { id: true, title: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);
    const batteryIds = batteries.map((b) => b.id);

    const reviewsRaw = await prisma.review.findMany({
      where: {
        transaction: {
          OR: [
            { vehicleId: { in: vehicleIds } },
            { batteryId: { in: batteryIds } },
          ],
        },
      },
      include: {
        transaction: {
          select: {
            vehicle: { select: { id: true, title: true } },
            battery: { select: { id: true, title: true } },
            buyer: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    const reviews = reviewsRaw.map((review) => {
      let type = "";
      let productId = "";
      let productTitle = "";
      if (review.transaction.vehicle) {
        type = "vehicle";
        productId = review.transaction.vehicle.id;
        productTitle = review.transaction.vehicle.title;
      } else if (review.transaction.battery) {
        type = "battery";
        productId = review.transaction.battery.id;
        productTitle = review.transaction.battery.title;
      }
      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        mediaUrls: review.mediaUrls,
        hasBeenEdited: review.hasBeenEdited,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        type,
        productId,
        productTitle,
        buyer: review.transaction.buyer,
      };
    });

    return {
      seller,
      // vehicles,
      // batteries,
      reviews,
    };
  },
  updateProfile: async (
    userId: string,
    data: { name?: string; removeAvatar?: string },
    avatarFile?: Express.Multer.File,
  ): Promise<User> => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const dataToUpdate: { name?: string; avatar?: string | null } = {};

    if (data.name) {
      dataToUpdate.name = data.name;
    }

    const oldAvatarUrl = user.avatar;

    if (avatarFile) {
      const fileName = `${userId}/${Date.now()}-avatar.webp`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .upload(fileName, avatarFile.buffer, {
          contentType: avatarFile.mimetype,
          upsert: true,
        });

      if (uploadError) {
        throw new InternalServerError(
          `Failed to upload avatar: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .getPublicUrl(uploadData.path);
      dataToUpdate.avatar = publicUrlData.publicUrl;
    } else if (data.removeAvatar === "true") {
      dataToUpdate.avatar = null;
    }

    if (oldAvatarUrl && dataToUpdate.avatar !== undefined) {
      try {
        const oldAvatarPath = oldAvatarUrl.split(
          `/${SUPABASE_BUCKETS.AVATARS}/`,
        )[1];
        await supabase.storage
          .from(SUPABASE_BUCKETS.AVATARS)
          .remove([oldAvatarPath]);
      } catch (error) {
        logger.warn("Failed to delete old avatar:", error);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
    });
    return updatedUser;
  },
  changePassword: async (
    userId: string,
    currentPassword_: string,
    newPassword_: string,
  ) => {
    const account = await prisma.account.findFirst({
      where: {
        userId: userId,
        provider: "CREDENTIALS",
      },
    });

    if (!account || !account.password) {
      throw new BadRequestError(
        "This account does not have a password set. It might be linked to a social provider.",
      );
    }

    const isPasswordMatch = await comparePassword(
      currentPassword_,
      account.password,
    );
    if (!isPasswordMatch) {
      throw new BadRequestError("Incorrect current password.");
    }

    const hashedNewPassword = await hashPassword(newPassword_);

    await prisma.account.update({
      where: { id: account.id },
      data: { password: hashedNewPassword },
    });
  },
};
