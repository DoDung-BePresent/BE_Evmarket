/**
 * Libs
 */
import { add } from "date-fns";
import prisma from "@/libs/prisma";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/libs/error";
import { walletService } from "./wallet.service";
import { IQueryOptions } from "@/types/pagination.type";

export const transactionService = {
  createTransaction: async (
    buyerId: string,
    vehicleId?: string,
    batteryId?: string,
  ) => {
    if (!vehicleId && !batteryId) {
      throw new BadRequestError("Must provide vehicleId or batteryId");
    }
    // let sellerId: string | undefined;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });
      if (!vehicle) throw new NotFoundError("Vehicle not found");
      //   sellerId = vehicle.sellerId;
    }
    if (batteryId) {
      const battery = await prisma.battery.findUnique({
        where: { id: batteryId },
      });
      if (!battery) throw new NotFoundError("Battery not found");
      //   sellerId = battery.sellerId;
    }
    const transaction = await prisma.transaction.create({
      data: {
        buyerId,
        vehicleId,
        batteryId,
        status: "PENDING",
      },
    });
    return transaction;
  },
  shipTransaction: async (transactionId: string, sellerId: string) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { vehicle: true, battery: true },
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found.");
    }

    const listing = transaction.vehicle || transaction.battery;
    if (listing?.sellerId !== sellerId) {
      throw new ForbiddenError("You are not the seller of this item.");
    }

    if (transaction.status !== "PAID") {
      throw new BadRequestError(
        "Transaction must be in PAID status to be shipped.",
      );
    }

    // Đặt hạn chót xác nhận là 1 ngày kể từ bây giờ
    const confirmationDeadline = add(new Date(), { days: 1 });

    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "SHIPPED",
        confirmationDeadline,
      },
    });
  },

  confirmReceipt: async (transactionId: string, buyerId: string) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found.");
    }
    if (transaction.buyerId !== buyerId) {
      throw new ForbiddenError("You are not the buyer of this transaction.");
    }
    if (transaction.status !== "SHIPPED") {
      throw new BadRequestError(
        "Transaction must be in SHIPPED status to be confirmed.",
      );
    }

    return transactionService.completeTransaction(transactionId);
  },

  disputeTransaction: async (
    transactionId: string,
    buyerId: string,
    reason: string,
  ) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found.");
    }
    if (transaction.buyerId !== buyerId) {
      throw new ForbiddenError("You are not the buyer of this transaction.");
    }
    if (transaction.status !== "SHIPPED") {
      throw new BadRequestError("Only shipped transactions can be disputed.");
    }
    if (
      transaction.confirmationDeadline &&
      new Date() > transaction.confirmationDeadline
    ) {
      throw new BadRequestError("The confirmation period has expired.");
    }

    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "DISPUTED",
        disputeReason: reason,
      },
    });
  },

  completeTransaction: async (transactionId: string) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { vehicle: true, battery: true },
      });

      if (
        !transaction ||
        (transaction.status !== "SHIPPED" && transaction.status !== "PAID")
      ) {
        throw new BadRequestError("Transaction cannot be completed.");
      }

      const listing = transaction.vehicle || transaction.battery;
      if (!listing) throw new InternalServerError("Listing not found");

      const priceToUse = transaction.finalPrice;
      if (priceToUse === null) {
        throw new InternalServerError("Transaction is missing final price.");
      }

      const feeRule = await tx.fee.findUnique({
        where: {
          type: listing.isAuction ? "AUCTION_SALE" : "REGULAR_SALE",
        },
      });
      const commission = (listing.price * (feeRule?.percentage || 0)) / 100;

      await walletService.releaseFunds(
        listing.sellerId,
        priceToUse,
        commission,
        tx,
      );

      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
      });
    });
  },

  getTransactionsByBuyer: async (buyerId: string, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    const [transactions, totalResults] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: { buyerId },
        include: {
          vehicle: { select: { title: true, images: true } },
          battery: { select: { title: true, images: true } },
        },
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
      }),
      prisma.transaction.count({ where: { buyerId } }),
    ]);

    return {
      transactions,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  getCompletedTransactions: async () => {
    return prisma.transaction.findMany({
      where: { status: "COMPLETED" },
      include: {
        vehicle: { select: { id: true, title: true, sellerId: true } },
        battery: { select: { id: true, title: true, sellerId: true } },
        buyer: { select: { id: true, name: true, avatar: true } },
        review: { select: { id: true, rating: true, comment: true } },
      },
    });
  },
};
