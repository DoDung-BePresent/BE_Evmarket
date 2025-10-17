/* eslint-disable @typescript-eslint/no-explicit-any */
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
  reviewAuctionRequest: async (
    listingType: ListingType,
    listingId: string,
    payload: { approved: boolean; rejectionReason?: string },
  ) => {
    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;
    const listing = await (model as any).findUnique({
      where: { id: listingId },
    });

    if (!listing || listing.status !== "AUCTION_PENDING_APPROVAL") {
      throw new NotFoundError(
        "Auction request not found or already processed.",
      );
    }

    if (payload.approved) {
      return (model as any).update({
        where: { id: listingId },
        data: {
          status: "AUCTION_LIVE",
          isVerified: true,
          auctionRejectionReason: null,
        },
      });
    } else {
      if (!payload.rejectionReason) {
        throw new BadRequestError("Rejection reason is required.");
      }
      return (model as any).update({
        where: { id: listingId },
        data: {
          status: "AUCTION_REJECTED",
          auctionRejectionReason: payload.rejectionReason,
        },
      });
    }
  },

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
