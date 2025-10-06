/**
 * Node modules
 */
import { Prisma } from "@prisma/client";

/**
 * Libs
 */
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/libs/error";
import prisma from "@/libs/prisma";
import { supabase } from "@/libs/supabase";

/**
 * Constants
 */
import { SUPABASE_BUCKETS } from "@/constants/supabase.constant";

/**
 * Types
 */
import { IQueryOptions } from "@/types/pagination.type";

export const batteryService = {
  createBattery: async (
    userId: string,
    batteryBody: Omit<Prisma.BatteryCreateWithoutSellerInput, "images">,
    files: Express.Multer.File[],
  ) => {
    if (!files || files.length === 0) {
      throw new BadRequestError("At least one image is required");
    }
    // TODO: Resize images
    const imageUrls: string[] = [];
    const uploadPromises = files.map(async (file) => {
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from(SUPABASE_BUCKETS.BATTERIES)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw new InternalServerError(
          `Failed to upload image: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKETS.BATTERIES)
        .getPublicUrl(fileName);
      imageUrls.push(publicUrlData.publicUrl);
    });
    await Promise.all(uploadPromises);

    return prisma.battery.create({
      data: {
        ...batteryBody,
        images: imageUrls,
        seller: {
          connect: { id: userId },
        },
        isVerified: batteryBody.isAuction ? false : true,
      },
    });
  },
  queryBatteries: async (filter: object, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    const batteries = await prisma.battery.findMany({
      where: filter,
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
    });

    const totalResults = await prisma.battery.count({ where: filter });

    return {
      batteries,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  getBatteriesBySellerId: async (sellerId: string, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    const filter = { sellerId };

    const batteries = await prisma.battery.findMany({
      where: filter,
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
    });

    const totalResults = await prisma.battery.count({ where: filter });

    return {
      batteries,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  getBatteryById: async (id: string) => {
    const battery = await prisma.battery.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });
    if (!battery) {
      throw new NotFoundError("Battery not found");
    }
    return battery;
  },
  updateBatteryById: async (
    batteryId: string,
    userId: string,
    updateBody: Partial<Prisma.BatteryUpdateInput> & {
      imagesToDelete?: string[];
    },
    files?: Express.Multer.File[],
  ) => {
    const battery = await prisma.battery.findUnique({
      where: { id: batteryId },
    });

    if (!battery) {
      throw new NotFoundError("Battery not found");
    }
    if (battery.sellerId !== userId) {
      throw new ForbiddenError("You are not the owner of this battery");
    }

    let newImageUrls: string[] = battery.images || [];

    // 1. Delete images marked for deletion
    if (updateBody.imagesToDelete && updateBody.imagesToDelete.length > 0) {
      const filePathsToDelete = updateBody.imagesToDelete
        .map((url) => {
          const urlParts = url.split(`/${SUPABASE_BUCKETS.BATTERIES}/`);
          if (urlParts.length < 2) return ""; // Handle invalid URL format
          return urlParts.slice(1).join(`/${SUPABASE_BUCKETS.BATTERIES}/`);
        })
        .filter(Boolean);

      if (filePathsToDelete.length > 0) {
        await supabase.storage.from(SUPABASE_BUCKETS.BATTERIES).remove(filePathsToDelete);
      }

      newImageUrls = newImageUrls.filter(
        (url) => !updateBody.imagesToDelete?.includes(url),
      );
    }

    // 2. Upload new images
    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const fileName = `${userId}/${Date.now()}-${file.originalname}`;
        const { error } = await supabase.storage
          .from(SUPABASE_BUCKETS.BATTERIES)
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (error) throw new InternalServerError("Failed to upload new image");
        return supabase.storage.from(SUPABASE_BUCKETS.BATTERIES).getPublicUrl(fileName).data
          .publicUrl;
      });
      const uploadedUrls = await Promise.all(uploadPromises);
      newImageUrls.push(...uploadedUrls);
    }

    const { imagesToDelete, ...restOfBody } = updateBody;

    return prisma.battery.update({
      where: { id: batteryId },
      data: {
        ...restOfBody,
        images: newImageUrls,
      },
    });
  },
  deleteBatteryById: async (batteryId: string, userId: string) => {
    const battery = await prisma.battery.findUnique({
      where: { id: batteryId },
    });

    if (!battery) {
      throw new NotFoundError("Battery not found");
    }
    if (battery.sellerId !== userId) {
      throw new ForbiddenError("You are not the owner of this battery");
    }

    // Delete images from Supabase storage
    if (battery.images && battery.images.length > 0) {
      const filePaths = battery.images.map((url) => {
        const parts = url.split(`/${SUPABASE_BUCKETS.BATTERIES}/`);
        return parts[1];
      });
      await supabase.storage.from(SUPABASE_BUCKETS.BATTERIES).remove(filePaths);
    }

    await prisma.battery.delete({ where: { id: batteryId } });
  },
};
