/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Node modules
 */
import { Prisma } from "@prisma/client";

/**
 * Types
 */
import { IQueryOptions } from "@/types/pagination.type";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/libs/error";
import { supabase } from "@/libs/supabase";

/**
 * Constants
 */
import { SUPABASE_BUCKETS } from "@/constants/supabase.constant";

export const vehicleService = {
  createVehicle: async (
    userId: string,
    vehicleBody: Omit<Prisma.VehicleCreateWithoutSellerInput, "images">,
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
        .from(SUPABASE_BUCKETS.VEHICLES)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw new InternalServerError(
          `Failed to upload image: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from(SUPABASE_BUCKETS.VEHICLES)
        .getPublicUrl(fileName);
      imageUrls.push(publicUrlData.publicUrl);
    });

    await Promise.all(uploadPromises);

    return prisma.vehicle.create({
      data: {
        ...vehicleBody,
        images: imageUrls,
        seller: {
          connect: { id: userId },
        },
        status: "AVAILABLE",
        isVerified: true,
      },
    });
  },
  queryVehicles: async (filter: object, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    const vehicles = await prisma.vehicle.findMany({
      where: filter,
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
    });

    const totalResults = await prisma.vehicle.count({ where: filter });

    return {
      vehicles,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  getVehicleById: async (id: string) => {
    const vehicle = await prisma.vehicle.findUnique({
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
    if (!vehicle) {
      throw new NotFoundError("Vehicle not found");
    }
    return vehicle;
  },
  getVehiclesBySellerId: async (sellerId: string, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    const filter = { sellerId };

    const vehicles = await prisma.vehicle.findMany({
      where: filter,
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
    });

    const totalResults = await prisma.vehicle.count({ where: filter });

    return {
      vehicles,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  updateVehicleById: async (
    vehicleId: string,
    userId: string,
    updateBody: Partial<Prisma.VehicleUpdateInput> & {
      imagesToDelete?: string[];
    },
    files?: Express.Multer.File[],
  ) => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundError("Vehicle not found");
    }
    if (vehicle.sellerId !== userId) {
      throw new ForbiddenError("You are not the owner of this vehicle");
    }

    let newImageUrls: string[] = vehicle.images || [];

    // 1. Delete images marked for deletion
    if (updateBody.imagesToDelete && updateBody.imagesToDelete.length > 0) {
      const filePathsToDelete = updateBody.imagesToDelete
        .map((url) => {
          const urlParts = url.split(`/${SUPABASE_BUCKETS.VEHICLES}/`);
          if (urlParts.length < 2) return ""; // Handle invalid URL format
          return urlParts.slice(1).join(`/${SUPABASE_BUCKETS.VEHICLES}/`);
        })
        .filter(Boolean);

      if (filePathsToDelete.length > 0) {
        await supabase.storage
          .from(SUPABASE_BUCKETS.VEHICLES)
          .remove(filePathsToDelete);
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
          .from(SUPABASE_BUCKETS.VEHICLES)
          .upload(fileName, file.buffer, { contentType: file.mimetype });
        if (error) throw new InternalServerError("Failed to upload new image");
        return supabase.storage
          .from(SUPABASE_BUCKETS.VEHICLES)
          .getPublicUrl(fileName).data.publicUrl;
      });
      const uploadedUrls = await Promise.all(uploadPromises);
      newImageUrls.push(...uploadedUrls);
    }

    const { imagesToDelete, ...restOfBody } = updateBody;

    return prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        ...restOfBody,
        images: newImageUrls,
      },
    });
  },
  deleteVehicleById: async (vehicleId: string, userId: string) => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundError("Vehicle not found");
    }
    if (vehicle.sellerId !== userId) {
      throw new ForbiddenError("You are not the owner of this vehicle");
    }

    // Delete images from Supabase storage
    if (vehicle.images && vehicle.images.length > 0) {
      const filePaths = vehicle.images.map((url) => {
        const parts = url.split(`/${SUPABASE_BUCKETS.VEHICLES}/`);
        return parts[1];
      });
      await supabase.storage.from(SUPABASE_BUCKETS.VEHICLES).remove(filePaths);
    }

    await prisma.vehicle.delete({ where: { id: vehicleId } });
  },
};
