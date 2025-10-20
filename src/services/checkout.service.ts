/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import { ListingType, PaymentGateway } from "@prisma/client";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Services
 */
import { momoService } from "@/services/momo.service";
import { walletService } from "@/services/wallet.service";

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
import logger from "@/libs/logger";

export const checkoutService = {
  initiateCheckout: async (
    buyerId: string,
    {
      listingId,
      listingType,
      paymentMethod,
    }: {
      listingId: string;
      listingType: ListingType;
      paymentMethod: PaymentGateway;
    },
  ) => {
    const listing = await (listingType === "VEHICLE"
      ? prisma.vehicle.findUnique({ where: { id: listingId } })
      : prisma.battery.findUnique({ where: { id: listingId } }));

    if (!listing || listing.status !== "AVAILABLE") {
      throw new NotFoundError("Item is not available for purchase.");
    }
    if (listing.sellerId === buyerId) {
      throw new ForbiddenError("You cannot purchase your own item.");
    }

    const transaction = await prisma.transaction.create({
      data: {
        buyerId,
        finalPrice: listing.price,
        paymentGateway: paymentMethod,
        ...(listingType === "VEHICLE"
          ? { vehicleId: listingId }
          : { batteryId: listingId }),
      },
    });

    if (paymentMethod === "WALLET") {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: buyerId },
      });
      if (!wallet || wallet.availableBalance < listing.price) {
        throw new BadRequestError(
          "Insufficient wallet balance. Please top up.",
        );
      }
      return { transactionId: transaction.id, paymentInfo: null };
    }

    if (paymentMethod === "MOMO") {
      const redirectUrl = `${config.CLIENT_URL}/checkout/result`;
      const ipnUrl = `${config.SERVER_URL}/payments/momo/ipn`;

      const paymentInfo = await momoService.createPayment({
        orderId: transaction.id,
        amount: listing.price,
        orderInfo: `Thanh toan cho san pham ${listing.title}`,
        redirectUrl,
        ipnUrl,
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { paymentDetail: paymentInfo as any },
      });

      return { transactionId: transaction.id, paymentInfo };
    }

    throw new BadRequestError("Invalid payment method.");
  },
  completeMomoPurchase: async (transactionId: string, paidAmount: number) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { vehicle: true, battery: true },
      });

      if (!transaction || transaction.status !== "PENDING") {
        logger.warn(
          `MoMo IPN: Received IPN for an invalid or already processed transaction ${transactionId}.`,
        );
        return;
      }

      if (transaction.finalPrice !== paidAmount) {
        logger.error(
          `MoMo IPN: Amount mismatch for transaction ${transactionId}. Expected ${transaction.finalPrice}, but received ${paidAmount}.`,
        );
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: "FAILED" },
        });
        return;
      }

      const sellerId =
        transaction.vehicle?.sellerId || transaction.battery?.sellerId;
      if (!sellerId) {
        throw new InternalServerError("Seller not found for this transaction.");
      }
      await tx.wallet.update({
        where: { userId: sellerId },
        data: { availableBalance: { increment: paidAmount } },
      });

      const listingType = transaction.vehicleId ? "VEHICLE" : "BATTERY";
      const listingId = transaction.vehicleId || transaction.batteryId;

      if (listingType === "VEHICLE") {
        await tx.vehicle.update({
          where: { id: listingId! },
          data: { status: "SOLD" },
        });
      } else {
        await tx.battery.update({
          where: { id: listingId! },
          data: { status: "SOLD" },
        });
      }

      const completedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
      });

      logger.info(
        `Successfully completed purchase for transaction ${completedTransaction.id}`,
      );
      return completedTransaction;
    });
  },
  payWithWallet: async (transactionId: string, buyerId: string) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { vehicle: true, battery: true },
      });

      if (
        !transaction ||
        transaction.buyerId !== buyerId ||
        transaction.status !== "PENDING"
      ) {
        throw new NotFoundError("Transaction not found or already processed.");
      }

      const price = transaction.finalPrice!;

      const sellerId =
        transaction.vehicle?.sellerId || transaction.battery?.sellerId;
      if (!sellerId)
        throw new InternalServerError("Seller not found for this transaction.");

      await walletService.updateBalance(buyerId, -price, "PURCHASE", tx);

      await walletService.updateBalance(sellerId, price, "SALE_REVENUE", tx);

      const listingType = transaction.vehicleId ? "VEHICLE" : "BATTERY";
      const listingId = transaction.vehicleId || transaction.batteryId;

      if (listingType === "VEHICLE") {
        await tx.vehicle.update({
          where: { id: listingId! },
          data: { status: "SOLD" },
        });
      } else {
        await tx.battery.update({
          where: { id: listingId! },
          data: { status: "SOLD" },
        });
      }

      const completedTransaction = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
      });

      return completedTransaction;
    });
  },
};
