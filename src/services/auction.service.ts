/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import { Bid, ListingStatus, ListingType } from "@prisma/client";

/**
 * Services
 */
import { walletService } from "@/services/wallet.service";

/**
 * Types
 */
import { IQueryOptions } from "@/types/pagination.type";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import redisClient from "@/libs/redis";
import { supabase } from "@/libs/supabase";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  InternalServerError,
} from "@/libs/error";
import { add } from "date-fns";

const AUCTION_REJECTION_LIMIT = 3;

export const auctionService = {
  createAuction: async (
    userId: string,
    listingType: "VEHICLE" | "BATTERY",
    payload: any,
    files: Express.Multer.File[],
  ) => {
    if (!files || files.length === 0) {
      throw new BadRequestError("At least one image is required");
    }

    const imageUrls: string[] = [];
    const uploadPromises = files.map(async (file) => {
      const folder = listingType === "VEHICLE" ? "vehicles" : "batteries";
      const fileName = `${userId}/${Date.now()}-${file.originalname}`;
      const { error: uploadError } = await supabase.storage
        .from(folder)
        .upload(fileName, file.buffer, { contentType: file.mimetype });

      if (uploadError) {
        throw new InternalServerError(
          `Failed to upload image: ${uploadError.message}`,
        );
      }
      const { data: publicUrlData } = supabase.storage
        .from(folder)
        .getPublicUrl(fileName);
      imageUrls.push(publicUrlData.publicUrl);
    });
    await Promise.all(uploadPromises);

    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;

    return (model as any).create({
      data: {
        ...payload,
        price: payload.startingPrice,
        images: imageUrls,
        seller: { connect: { id: userId } },
        isAuction: true,
        isVerified: false,
        status: "AUCTION_PENDING_APPROVAL",
      },
    });
  },
  requestAuction: async (
    userId: string,
    listingType: ListingType,
    listingId: string,
    payload: {
      startingPrice: number;
      bidIncrement: number;
      depositAmount?: number;
      auctionEndsAt: Date;
    },
  ) => {
    const redisKey = `auction-rejection:${listingType}:${listingId}`;
    const rejectionCountStr = await redisClient.get(redisKey);
    const rejectionCount = rejectionCountStr
      ? parseInt(rejectionCountStr, 10)
      : 0;

    if (rejectionCount >= AUCTION_REJECTION_LIMIT) {
      throw new ForbiddenError(
        `This item has been rejected ${AUCTION_REJECTION_LIMIT} times. Please try again later or contact support.`,
      );
    }

    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;
    const listing = await (model as any).findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundError(`${listingType} not found.`);
    }
    if (listing.sellerId !== userId) {
      throw new ForbiddenError("You are not the owner of this listing.");
    }
    if (listing.status !== "AVAILABLE") {
      throw new ForbiddenError(
        "Only available listings can be put up for auction.",
      );
    }
    return (model as any).update({
      where: { id: listingId },
      data: {
        ...payload,
        isAuction: true,
        status: "AUCTION_PENDING_APPROVAL",
      },
    });
  },
  getAuctionDetails: async (
    listingType: ListingType,
    listingId: string,
    userId?: string,
  ) => {
    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;

    const listing = await (model as any).findUnique({
      where: { id: listingId, isAuction: true },
      include: {
        seller: {
          select: { id: true, name: true, avatar: true, isVerified: true },
        },
        bids: {
          orderBy: { createdAt: "desc" },
          include: {
            bidder: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!listing) {
      throw new NotFoundError("Auction not found.");
    }

    let userAuctionResult: "WON" | "LOST" | "NO_BIDS" | null = null;
    const endedStatuses: ListingStatus[] = [
      "AUCTION_ENDED",
      "AUCTION_PAYMENT_PENDING",
      "SOLD",
    ];

    if (endedStatuses.includes(listing.status)) {
      const winnerBid = listing.bids[0];

      if (winnerBid) {
        const winnerId = winnerBid.bidderId;
        if (userId && userId === winnerId) {
          userAuctionResult = "WON";
        } else if (userId) {
          const userHasBid = listing.bids.some(
            (bid: Bid) => bid.bidderId === userId,
          );
          if (userHasBid) {
            userAuctionResult = "LOST";
          }
        }
      } else {
        userAuctionResult = "NO_BIDS";
      }
    }

    let hasUserDeposit = false;
    if (userId) {
      const deposit = await prisma.auctionDeposit.findFirst({
        where: {
          userId,
          ...(listingType === "VEHICLE"
            ? { vehicleId: listingId }
            : { batteryId: listingId }),
          status: "PAID",
        },
      });
      hasUserDeposit = !!deposit;
    }

    return { ...listing, hasUserDeposit, userAuctionResult };
  },

  buyNow: async (
    userId: string,
    listingType: ListingType,
    listingId: string,
  ) => {
    return prisma.$transaction(async (tx) => {
      const model = listingType === "VEHICLE" ? tx.vehicle : tx.battery;

      const listing = await (model as any).findUnique({
        where: { id: listingId },
      });

      if (!listing || !listing.isAuction || listing.status !== "AUCTION_LIVE") {
        throw new NotFoundError("This auction is not available for purchase.");
      }
      if (!listing.buyNowPrice || listing.buyNowPrice <= 0) {
        throw new BadRequestError(
          "This item does not have a 'Buy Now' option.",
        );
      }
      if (listing.sellerId === userId) {
        throw new ForbiddenError("You cannot purchase your own item.");
      }

      await (model as any).update({
        where: { id: listingId },
        data: {
          status: "AUCTION_PAYMENT_PENDING",
          auctionEndsAt: new Date(),
        },
      });

      const transaction = await tx.transaction.create({
        data: {
          buyerId: userId,
          finalPrice: listing.buyNowPrice,
          status: "PENDING",
          type: "AUCTION",
          paymentDeadline: add(new Date(), { hours: 24 }),
          ...(listingType === "VEHICLE"
            ? { vehicleId: listingId }
            : { batteryId: listingId }),
        },
      });

      await walletService.refundAllDeposits(
        listingId,
        listingType,
        userId, 
        tx,
      );

      return transaction;
    });
  },

  queryLiveAuctions: async (options: IQueryOptions & { time?: string }) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "auctionStartsAt",
      sortOrder = "asc",
      time = "present",
    } = options;
    const skip = (page - 1) * limit;

    let commonWhere: any;
    const now = new Date();

    switch (time) {
      case "future":
        commonWhere = {
          status: "AUCTION_LIVE" as const,
          auctionStartsAt: { gt: now },
        };
        break;
      case "past":
        commonWhere = {
          status: {
            in: ["AUCTION_ENDED", "AUCTION_PAYMENT_PENDING", "SOLD"],
          },
          isAuction: true,
        };
        break;
      case "present":
      default:
        commonWhere = {
          status: "AUCTION_LIVE" as const,
          auctionEndsAt: { gt: now },
        };
        break;
    }

    const liveVehicles = await prisma.vehicle.findMany({
      where: commonWhere,
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    });

    const liveBatteries = await prisma.battery.findMany({
      where: commonWhere,
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    });

    const allLiveAuctions = [
      ...liveVehicles.map((v) => ({ ...v, listingType: "VEHICLE" })),
      ...liveBatteries.map((b) => ({ ...b, listingType: "BATTERY" })),
    ];
    allLiveAuctions.sort((a, b) => {
      const aValue = a[sortBy as keyof typeof a];
      const bValue = b[sortBy as keyof typeof b];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    const paginatedResults = allLiveAuctions.slice(skip, skip + limit);
    const totalResults = allLiveAuctions.length;

    return {
      results: paginatedResults,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  payAuctionDeposit: async (
    userId: string,
    listingType: ListingType,
    listingId: string,
  ) => {
    return prisma.$transaction(async (tx) => {
      const listing = await (tx as any)[listingType.toLowerCase()].findUnique({
        where: { id: listingId },
      });

      if (listing.sellerId === userId) {
        throw new ForbiddenError(
          "You cannot pay a deposit on your own auction.",
        );
      }

      if (!listing || listing.status !== "AUCTION_LIVE") {
        throw new BadRequestError("Auction is not available for deposit.");
      }

      if (!listing.depositAmount || listing.depositAmount <= 0) {
        throw new BadRequestError("This auction does not require a deposit.");
      }

      const existingDeposit = await tx.auctionDeposit.findFirst({
        where: { userId, [`${listingType.toLowerCase()}Id`]: listingId },
      });
      if (existingDeposit) {
        throw new ConflictError(
          "You have already paid a deposit for this auction.",
        );
      }

      await walletService.updateBalance(
        userId,
        -listing.depositAmount,
        "AUCTION_DEPOSIT",
        tx,
      );

      const deposit = await tx.auctionDeposit.create({
        data: {
          amount: listing.depositAmount,
          userId,
          [`${listingType.toLowerCase()}Id`]: listingId,
        },
      });

      return deposit;
    });
  },
  placeBid: async ({
    listingType,
    listingId,
    bidderId,
    amount,
  }: {
    listingType: ListingType;
    listingId: string;
    bidderId: string;
    amount: number;
  }) => {
    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;

    const listing = await (model as any).findUnique({
      where: { id: listingId },
      include: {
        bids: {
          orderBy: { amount: "desc" },
          take: 1,
        },
      },
    });
    if (!listing) {
      throw new NotFoundError(`${listingType} not found.`);
    }

    if (listing.depositAmount > 0) {
      const deposit = await prisma.auctionDeposit.findFirst({
        where: {
          userId: bidderId,
          [`${listingType.toLowerCase()}Id`]: listingId,
          status: "PAID",
        },
      });
      if (!deposit) {
        throw new ForbiddenError(
          "You must pay a deposit before placing a bid on this auction.",
        );
      }
    }

    if (listing.sellerId === bidderId) {
      throw new ForbiddenError("You cannot bid on your own auction.");
    }

    const highestBidderId = listing.bids[0]?.bidderId;
    if (highestBidderId && highestBidderId === bidderId) {
      throw new BadRequestError(
        "You are already the highest bidder. Please wait for another bid.",
      );
    }

    if (new Date() < new Date(listing.auctionStartsAt)) {
      throw new BadRequestError("This auction has not started yet.");
    }

    if (listing.status !== "AUCTION_LIVE") {
      throw new BadRequestError("This auction is not currently active.");
    }

    if (new Date() > new Date(listing.auctionEndsAt)) {
      throw new BadRequestError("This auction has already ended.");
    }

    const highestBid = listing.bids[0]?.amount || 0;
    const startingPrice = listing.startingPrice || 0;
    const bidIncrement = listing.bidIncrement || 1;
    const minimumBid =
      highestBid > 0 ? highestBid + bidIncrement : startingPrice;

    if (amount < minimumBid) {
      throw new BadRequestError(
        `Your bid must be at least ${minimumBid.toLocaleString()} VND.`,
      );
    }

    return prisma.bid.create({
      data: {
        amount,
        bidder: { connect: { id: bidderId } },
        ...(listingType === "VEHICLE"
          ? { vehicle: { connect: { id: listingId } } }
          : { battery: { connect: { id: listingId } } }),
      },
    });
  },
};
