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
  InternalServerError,
  NotFoundError,
} from "@/libs/error";
import { supabase } from "@/libs/supabase";

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
        .from("vehicles")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw new InternalServerError(
          `Failed to upload image: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("vehicles")
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
};
