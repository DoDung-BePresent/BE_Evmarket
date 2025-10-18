/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import { ListingType } from "@prisma/client";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/libs/error";
import { walletService } from "./wallet.service"; // Import walletService

export const auctionService = {
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
  payAuctionDeposit: async (
    userId: string,
    listingType: ListingType,
    listingId: string,
  ) => {
    // Dùng transaction để đảm bảo tính toàn vẹn
    return prisma.$transaction(async (tx) => {
      const listing = await (tx as any)[listingType.toLowerCase()].findUnique({
        where: { id: listingId },
      });

      if (!listing || listing.status !== "AUCTION_LIVE") {
        throw new BadRequestError("Auction is not available for deposit.");
      }
      if (!listing.depositAmount || listing.depositAmount <= 0) {
        throw new BadRequestError("This auction does not require a deposit.");
      }

      // Kiểm tra xem đã đặt cọc chưa
      const existingDeposit = await tx.auctionDeposit.findFirst({
        where: { userId, [`${listingType.toLowerCase()}Id`]: listingId },
      });
      if (existingDeposit) {
        throw new ConflictError(
          "You have already paid a deposit for this auction.",
        );
      }

      // Trừ tiền từ ví người dùng
      await walletService.updateBalance(
        userId,
        -listing.depositAmount,
        "AUCTION_DEPOSIT",
        tx,
      );

      // Tạo bản ghi đặt cọc
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
