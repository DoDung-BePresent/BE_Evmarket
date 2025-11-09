/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import { ListingType, PaymentGateway, FeeType } from "@prisma/client";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Services
 */
import { momoService } from "@/services/momo.service";
import { walletService } from "@/services/wallet.service";
import { contractService } from "@/services/contract.service";

/**
 * Libs
 */
import logger from "@/libs/logger";
import prisma from "@/libs/prisma";
import { BadRequestError, ForbiddenError, InternalServerError, NotFoundError } from "@/libs/error";

export const checkoutService = {
  initiateCheckout: async (
    buyerId: string,
    {
      listingId,
      listingType,
      paymentMethod,
      redirectUrl: clientRedirectUrl,
    }: {
      listingId: string;
      listingType: ListingType;
      paymentMethod: PaymentGateway;
      redirectUrl?: string;
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
      const redirectUrl =
        clientRedirectUrl || `${config.CLIENT_URL}/checkout/result`;
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
    const updatedTransaction = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });

      if (!transaction || transaction.status !== "PENDING") {
        logger.warn(
          `completeMomoPurchase: Invalid or already processed transaction ${transactionId}`,
        );
        return null;
      }

      const listing = transaction.vehicle || transaction.battery;
      if (!listing) {
        throw new NotFoundError(
          "Associated listing not found for transaction.",
        );
      }

      if (listing.price !== paidAmount) {
        throw new BadRequestError("Paid amount does not match listing price.");
      }

      const feeType = listing.isAuction
        ? FeeType.AUCTION_SALE
        : FeeType.REGULAR_SALE;

      const feeRule = await tx.fee.findUnique({
        where: { type: feeType },
      });

      if (!feeRule) {
        throw new InternalServerError(`Fee rule for ${feeType} not found.`);
      }

      const commissionAmount = (listing.price * feeRule.percentage) / 100;
      const sellerRevenue = listing.price - commissionAmount;

      const model = transaction.vehicleId ? tx.vehicle : tx.battery;
      await (model as any).update({
        where: { id: listing.id },
        data: { status: "SOLD" },
      });

      await walletService.updateBalance(
        listing.seller.id,
        sellerRevenue,
        "SALE_REVENUE",
        tx,
      );

      await walletService.addCommissionFeeToSystemWallet(commissionAmount, tx);

      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });
    });

    if (updatedTransaction) {
      try {
        await contractService.generateAndSaveContract(updatedTransaction);
        logger.info(`Contract generated for transaction ${transactionId}`);
      } catch (error) {
        logger.error(
          `Failed to generate contract for transaction ${transactionId}`,
          error,
        );
      }
    }

    logger.info(`Transaction ${transactionId} processing finished.`);
    return updatedTransaction;
  },

  payWithWallet: async (transactionId: string, buyerId: string) => {
    const completedTransaction = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });

      if (
        !transaction ||
        transaction.buyerId !== buyerId ||
        transaction.status !== "PENDING"
      ) {
        throw new NotFoundError("Transaction not found or already processed.");
      }

      const price = transaction.finalPrice!;
      const listing = transaction.vehicle || transaction.battery;
      if (!listing) {
        throw new InternalServerError("Associated listing not found.");
      }

      await walletService.updateBalance(buyerId, -price, "PURCHASE", tx);

      const feeType = listing.isAuction
        ? FeeType.AUCTION_SALE
        : FeeType.REGULAR_SALE;
      const feeRule = await tx.fee.findUnique({ where: { type: feeType } });
      if (!feeRule) {
        throw new InternalServerError(`Fee rule for ${feeType} not found.`);
      }

      const commissionAmount = (price * feeRule.percentage) / 100;
      const sellerRevenue = price - commissionAmount;

      await walletService.updateBalance(
        listing.seller.id,
        sellerRevenue,
        "SALE_REVENUE",
        tx,
      );

      await walletService.addCommissionFeeToSystemWallet(commissionAmount, tx);

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

      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });
    });

    if (completedTransaction) {
      try {
        await contractService.generateAndSaveContract(completedTransaction);
        logger.info(`Contract generated for transaction ${transactionId}`);
      } catch (error) {
        logger.error(
          `Failed to generate contract for transaction ${transactionId}`,
          error,
        );
      }
    }

    return completedTransaction;
  },
};
