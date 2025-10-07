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

export const walletService = {
  /**
   * Creates a new wallet for a user.
   * Should be called upon user registration.
   */
  createWallet: async (userId: string) => {
    return prisma.wallet.create({
      data: {
        userId,
      },
    });
  },

  /**
   * Retrieves the wallet for a given user.
   */
  getWalletByUserId: async (userId: string) => {
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      throw new NotFoundError("Wallet not found for this user");
    }
    return wallet;
  },

  /**
   * Creates a deposit request and returns a payment URL.
   */
  createDepositRequest: async (userId: string, amount: number) => {
    const wallet = await walletService.getWalletByUserId(userId);

    // 1. Create a pending financial transaction
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
