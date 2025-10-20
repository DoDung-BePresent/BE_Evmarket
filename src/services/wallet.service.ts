 
/**
 * Node modules
 */
import { FinancialTransactionType, PrismaClient } from "@prisma/client";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { BadRequestError, NotFoundError } from "@/libs/error";

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
  createDepositRequest: async (userId: string, amount: number) => {
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

    const redirectUrl = `${config.CLIENT_URL}/wallet/`;
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
