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
import { contractService } from "@/services/contract.service";
import { emailService } from "@/services/email.service";

/**
 * Libs
 */
import logger from "@/libs/logger";
import prisma from "@/libs/prisma";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/libs/error";

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

  payForAuctionTransaction: async (
    buyerId: string,
    transactionId: string,
    paymentMethod: PaymentGateway,
    clientRedirectUrl?: string,
  ) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found.");
    }
    if (transaction.buyerId !== buyerId) {
      throw new ForbiddenError(
        "You are not authorized to pay for this transaction.",
      );
    }
    if (transaction.type !== "AUCTION") {
      throw new BadRequestError("This is not an auction transaction.");
    }
    if (transaction.status !== "PENDING") {
      throw new BadRequestError("This transaction is not pending payment.");
    }
    if (
      transaction.paymentDeadline &&
      new Date() > transaction.paymentDeadline
    ) {
      throw new BadRequestError(
        "The payment deadline for this auction has passed.",
      );
    }

    if (paymentMethod === "WALLET") {
      // Nếu dùng ví, gọi thẳng hàm payWithWallet đã có
      return checkoutService.payWithWallet(transactionId, buyerId);
    }

    if (paymentMethod === "MOMO") {
      // Nếu dùng MoMo, tạo yêu cầu thanh toán mới
      const redirectUrl =
        clientRedirectUrl || `${config.CLIENT_URL}/checkout/result`;
      const ipnUrl = `${config.SERVER_URL}/payments/momo/ipn`;

      if (transaction.finalPrice === null) {
        throw new InternalServerError(
          "Transaction is missing final price for payment.",
        );
      }

      const paymentInfo = await momoService.createPayment({
        orderId: transaction.id,
        amount: transaction.finalPrice,
        orderInfo: `Thanh toan cho san pham dau gia`,
        redirectUrl,
        ipnUrl,
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { paymentDetail: paymentInfo as any, paymentGateway: "MOMO" },
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

      // SỬA LỖI: So sánh với finalPrice của giao dịch, không phải giá của sản phẩm
      if (transaction.finalPrice !== paidAmount) {
        throw new BadRequestError(
          "Paid amount does not match transaction price.",
        );
      }

      // Cập nhật trạng thái giao dịch thành PAID
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "PAID" },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });

      // Chuyển tiền vào ví đang khóa của người bán
      await walletService.addLockedBalance(
        listing.seller.id,
        listing.price,
        tx,
      );

      logger.info(
        `Transaction ${transactionId} paid. Funds are locked for seller ${listing.seller.id}.`,
      );

      return updatedTx;
    });

    // Việc tạo hợp đồng vẫn giữ nguyên
    if (updatedTransaction) {
      try {
        const pdfBuffer =
          await contractService.generateAndSaveContract(updatedTransaction);
        logger.info(`Contract generated for transaction ${transactionId}`);

        // Gửi email cho người mua và người bán
        const seller =
          updatedTransaction.vehicle?.seller ||
          updatedTransaction.battery?.seller;
        if (seller && pdfBuffer) {
          await Promise.all([
            emailService.sendContractEmail(
              updatedTransaction.buyer.email,
              updatedTransaction.buyer.name,
              transactionId,
              Buffer.from(pdfBuffer),
            ),
            emailService.sendContractEmail(
              seller.email,
              seller.name,
              transactionId,
              Buffer.from(pdfBuffer),
            ),
          ]);
        }
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

      // Trừ tiền từ ví người mua
      await walletService.updateBalance(buyerId, -price, "PURCHASE", tx);

      // Cập nhật trạng thái giao dịch thành PAID
      const updatedTx = await tx.transaction.update({
        where: { id: transactionId },
        data: { status: "PAID" },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });

      // Chuyển tiền vào ví đang khóa của người bán
      await walletService.addLockedBalance(listing.seller.id, price, tx);

      logger.info(
        `Transaction ${transactionId} paid with wallet. Funds are locked for seller ${listing.seller.id}.`,
      );

      return updatedTx;
    });

    // Việc tạo hợp đồng vẫn giữ nguyên
    if (completedTransaction) {
      try {
        const pdfBuffer =
          await contractService.generateAndSaveContract(completedTransaction);
        logger.info(`Contract generated for transaction ${transactionId}`);

        // Gửi email cho người mua và người bán
        const seller =
          completedTransaction.vehicle?.seller ||
          completedTransaction.battery?.seller;
        if (seller && pdfBuffer) {
          await Promise.all([
            emailService.sendContractEmail(
              completedTransaction.buyer.email,
              completedTransaction.buyer.name,
              transactionId,
              Buffer.from(pdfBuffer),
            ),
            emailService.sendContractEmail(
              seller.email,
              seller.name,
              transactionId,
              Buffer.from(pdfBuffer),
            ),
          ]);
        }
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
