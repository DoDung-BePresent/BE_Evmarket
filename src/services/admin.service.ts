/**
 * Node modules
 */
import { ListingType } from "@prisma/client";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { NotFoundError, BadRequestError } from "@/libs/error";

export const adminService = {
  approveListing: async (listingType: ListingType, listingId: string) => {
    if (listingType === "VEHICLE") {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: listingId },
      });
      if (!vehicle) throw new NotFoundError("Vehicle not found");

      return prisma.vehicle.update({
        where: { id: listingId },
        data: { isVerified: true, status: "AUCTION_LIVE" },
      });
    } else if (listingType === "BATTERY") {
      const battery = await prisma.battery.findUnique({
        where: { id: listingId },
      });
      if (!battery) throw new NotFoundError("Battery not found");

      return prisma.battery.update({
        where: { id: listingId },
        data: { isVerified: true, status: "AUCTION_LIVE" },
      });
    } else {
      throw new BadRequestError("Invalid listing type");
    }
  },
};
