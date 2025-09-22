/**
 * Node modules
 */
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "@/libs/error";
import prisma from "@/libs/prisma";
import { supabase } from "@/libs/supabase";
import { IQueryOptions } from "@/types/pagination.type";
import { Prisma } from "@prisma/client";

export const batteryService = {
  createBattery: async (
    userId: string,
    batteryBody: Omit<Prisma.BatteryCreateWithoutSellerInput, "images">,
    files: Express.Multer.File[],
  ) => {
    if (!files || files.length === 0) {
      throw new BadRequestError("At least one image is required");
    }

    const imageUrls: string[] = [];
    const uploadPromises = files.map(async (file) => {
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from("batteries")
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
        });

      if (uploadError) {
        throw new InternalServerError(
          `Failed to upload image: ${uploadError.message}`,
        );
      }

      const { data: publicUrlData } = supabase.storage
        .from("batteries")
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
};
