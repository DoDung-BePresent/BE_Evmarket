/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import { ListingType } from "@prisma/client";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import redisClient from "@/libs/redis";
import { NotFoundError, BadRequestError } from "@/libs/error";

const AUCTION_REJECTION_EXPIRY = 24 * 60 * 60;

/**
 * Types
 */
import { IQueryOptions } from "@/types/pagination.type";

export const adminService = {
  getPendingAuctionRequests: async (
    options: IQueryOptions & { status?: string },
  ) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
    } = options;
    const skip = (page - 1) * limit;

    const auctionStatuses = [
      "AUCTION_PENDING_APPROVAL",
      "AUCTION_REJECTED",
      "AUCTION_LIVE",
      "AUCTION_ENDED",
      "AUCTION_PAYMENT_PENDING",
    ] as const;

    let commonWhere: any;
    if (status && status !== "ALL") {
      commonWhere = { status: status as any };
    } else {
      commonWhere = { status: { in: auctionStatuses as any } };
    }

    const pendingVehicles = await prisma.vehicle.findMany({
      where: commonWhere,
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    });

    const pendingBatteries = await prisma.battery.findMany({
      where: commonWhere,
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    });

    const allPendingRequests = [
      ...pendingVehicles.map((v) => ({ ...v, listingType: "VEHICLE" })),
      ...pendingBatteries.map((b) => ({ ...b, listingType: "BATTERY" })),
    ];

    allPendingRequests.sort((a, b) => {
      const dateA = new Date((a as any)[sortBy] as string).getTime();
      const dateB = new Date((b as any)[sortBy] as string).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    const paginatedResults = allPendingRequests.slice(skip, skip + limit);
    const totalResults = allPendingRequests.length;

    return {
      requests: paginatedResults,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },

  reviewAuctionRequest: async (
    listingType: ListingType,
    listingId: string,
    payload: {
      approved: boolean;
      rejectionReason?: string;
      auctionStartsAt?: Date;
      auctionEndsAt?: Date;
    },
  ) => {
    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;
    const redisKey = `auction-rejection:${listingType}:${listingId}`;

    const listing = await (model as any).findUnique({
      where: { id: listingId },
    });

    if (!listing || listing.status !== "AUCTION_PENDING_APPROVAL") {
      throw new NotFoundError(
        "Auction request not found or already processed.",
      );
    }

    if (payload.approved) {
      await redisClient.del(redisKey);

      return (model as any).update({
        where: { id: listingId },
        data: {
          status: "AUCTION_LIVE",
          isVerified: true,
          auctionRejectionReason: null,
          auctionStartsAt: payload.auctionStartsAt,
          auctionEndsAt: payload.auctionEndsAt,
        },
      });
    } else {
      if (!payload.rejectionReason) {
        throw new BadRequestError("Rejection reason is required.");
      }

      const newCount = await redisClient.incr(redisKey);
      if (newCount === 1) {
        await redisClient.expire(redisKey, AUCTION_REJECTION_EXPIRY);
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
