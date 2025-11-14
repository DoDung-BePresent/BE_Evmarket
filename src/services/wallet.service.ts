/**
 * Node modules
 */
import {
  FinancialTransactionType,
  PrismaClient,
  Prisma,
  ListingType,
} from "@prisma/client";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import {
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from "@/libs/error";
import logger from "@/libs/logger";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Services
 */
import { momoService } from "@/services/momo.service";

/**
 * Types
 */
import { IQueryOptions } from "@/types/pagination.type";

type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export const walletService = {
  createWallet: async (userId: string) => {
    return prisma.wallet.create({
      data: {
        userId,
      },
    });
  },
  updateBalance: async (
    userId: string,
    amount: number,
    type: FinancialTransactionType,
    tx?: PrismaTransactionClient,
  ) => {
    const prismaClient = tx || prisma;

    const wallet = await prismaClient.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundError("User wallet not found.");
    }

    if (wallet.availableBalance + amount < 0) {
      throw new BadRequestError("Insufficient available balance.");
    }

    const updatedWallet = await prismaClient.wallet.update({
      where: { userId },
      data: {
        availableBalance: {
          increment: amount,
        },
      },
    });

    await prismaClient.financialTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type,
        status: "COMPLETED", // Assume direct balance updates are always completed
        gateway: "INTERNAL",
      },
    });

    return updatedWallet;
  },
  getWalletByUserId: async (userId: string) => {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundError("Wallet not found for this user");
    }
    return wallet;
  },
  addCommissionFeeToSystemWallet: async (
    amount: number,
    tx?: PrismaTransactionClient,
  ) => {
    const prismaClient = tx || prisma;
    const systemUser = await prismaClient.user.findUnique({
      where: { email: "system@evmarket.local" },
      include: { wallet: true },
    });

    if (!systemUser?.wallet?.id) {
      throw new InternalServerError(
        "System wallet not found. Please run database seeds.",
      );
    }

    await prismaClient.wallet.update({
      where: { id: systemUser.wallet.id },
      data: { availableBalance: { increment: amount } },
    });

    await prismaClient.financialTransaction.create({
      data: {
        walletId: systemUser.wallet.id,
        type: "COMMISSION_FEE",
        amount,
        status: "COMPLETED",
        gateway: "INTERNAL",
        description: "System commission fee collected.",
      },
    });
  },
  addLockedBalance: async (
    userId: string,
    amount: number,
    tx: Prisma.TransactionClient,
  ) => {
    return tx.wallet.update({
      where: { userId },
      data: {
        lockedBalance: {
          increment: amount,
        },
      },
    });
  },
  releaseFunds: async (
    sellerId: string,
    amount: number,
    commission: number,
    tx: Prisma.TransactionClient,
  ) => {
    const sellerRevenue = amount - commission;
    await tx.wallet.update({
      where: { userId: sellerId },
      data: {
        lockedBalance: {
          decrement: amount,
        },
        availableBalance: {
          increment: sellerRevenue,
        },
      },
    });
    await walletService.addCommissionFeeToSystemWallet(commission, tx);
  },
  refundToBuyer: async (
    buyerId: string,
    sellerId: string,
    amount: number,
    tx: PrismaTransactionClient,
  ) => {
    await tx.wallet.update({
      where: { userId: sellerId },
      data: { lockedBalance: { decrement: amount } },
    });

    await tx.wallet.update({
      where: { userId: buyerId },
      data: { availableBalance: { increment: amount } },
    });

    await Promise.all([
      walletService.createFinancialTransaction(
        sellerId,
        -amount,
        "REFUND",
        tx,
        "Refund issued to buyer for disputed transaction",
      ),
      walletService.createFinancialTransaction(
        buyerId,
        amount,
        "REFUND",
        tx,
        "Refund received for disputed transaction",
      ),
    ]);
  },
  createFinancialTransaction: async (
    userId: string,
    amount: number,
    type: FinancialTransactionType,
    tx: PrismaTransactionClient,
    description?: string,
  ) => {
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new NotFoundError(`Wallet not found for user ${userId}`);
    }

    return tx.financialTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type,
        status: "COMPLETED",
        gateway: "INTERNAL",
        description,
      },
    });
  },
  refundAllDeposits: async (
    listingId: string,
    listingType: ListingType,
    excludeUserId: string | null, // ID của người mua ngay để không hoàn cọc cho họ
    tx: PrismaTransactionClient,
  ) => {
    const whereClause: Prisma.AuctionDepositWhereInput = {
      status: "PAID",
      [`${listingType.toLowerCase()}Id`]: listingId,
    };

    if (excludeUserId) {
      whereClause.userId = { not: excludeUserId };
    }

    const depositsToRefund = await tx.auctionDeposit.findMany({
      where: whereClause,
    });

    if (depositsToRefund.length === 0) {
      return; // Không có khoản cọc nào cần hoàn lại
    }

    const refundPromises = depositsToRefund.map(async (deposit) => {
      // 1. Hoàn tiền vào ví của người dùng
      await tx.wallet.update({
        where: { userId: deposit.userId },
        data: { availableBalance: { increment: deposit.amount } },
      });

      // 2. Tạo bản ghi giao dịch tài chính
      await walletService.createFinancialTransaction(
        deposit.userId,
        deposit.amount,
        "AUCTION_DEPOSIT_REFUND",
        tx,
        `Refund deposit for ${listingType.toLowerCase()} #${listingId}`,
      );
    });

    await Promise.all(refundPromises);

    // 3. Cập nhật trạng thái của tất cả các khoản cọc thành REFUNDED
    await tx.auctionDeposit.updateMany({
      where: whereClause,
      data: { status: "REFUNDED" },
    });

    logger.info(
      `Refunded ${depositsToRefund.length} deposits for ${listingType.toLowerCase()} #${listingId}`,
    );
  },

  createDepositRequest: async (
    userId: string,
    amount: number,
    redirectUrl: string,
  ) => {
    const wallet = await walletService.getWalletByUserId(userId);

    const financialTransaction = await prisma.financialTransaction.create({
      data: {
        walletId: wallet.id,
        amount,
        type: "DEPOSIT",
        status: "PENDING",
        gateway: "MOMO",
        description: `User deposits ${amount} VND`,
      },
    });

    // const redirectUrl = `${config.CLIENT_URL}/wallet/`;
    const ipnUrl = `${config.SERVER_URL}/payments/momo/ipn`; // URL webhook của bạn

    const paymentInfo = await momoService.createPayment({
      orderId: financialTransaction.id,
      amount,
      orderInfo: `Nap ${amount} VND vao vi EVmarket`,
      redirectUrl,
      ipnUrl,
    });

    return paymentInfo;
  },

  getFinancialHistory: async (userId: string, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        wallet: {
          userId: userId,
        },
      },
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
    });

    const totalResults = await prisma.financialTransaction.count({
      where: {
        wallet: {
          userId: userId,
        },
      },
    });

    return {
      transactions,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  processSuccessfulDeposit: async (
    orderId: string,
    amount: number,
    transId: string,
  ) => {
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id: orderId },
    });

    if (!transaction || transaction.status === "COMPLETED") {
      // Giao dịch không tồn tại hoặc đã được xử lý
      return;
    }

    if (transaction.amount !== amount) {
      // Số tiền không khớp, có thể là gian lận
      throw new BadRequestError("Deposit amount mismatch");
    }

    await prisma.$transaction([
      // 1. Update financial transaction status
      prisma.financialTransaction.update({
        where: { id: orderId },
        data: { status: "COMPLETED", gatewayTransId: transId },
      }),
      // 2. Update user's wallet balance
      prisma.wallet.update({
        where: { id: transaction.walletId },
        data: { availableBalance: { increment: amount } },
      }),
    ]);
  },
  processFailedDeposit: async (orderId: string) => {
    await prisma.financialTransaction.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
  },
};
