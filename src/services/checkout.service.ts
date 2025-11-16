/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
import { transactionService } from "@/services/transaction.service";

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
      listingId?: string;
      listingType?: ListingType;
      paymentMethod: PaymentGateway;
      redirectUrl?: string;
    },
  ) => {
    // Trường hợp 1: Mua một sản phẩm cụ thể (xe hoặc pin)
    if (listingId && listingType) {
      return checkoutService.initiateSingleItemCheckout(buyerId, {
        listingId,
        listingType,
        paymentMethod,
        redirectUrl: clientRedirectUrl,
      });
    }
    // Trường hợp 2: Thanh toán toàn bộ giỏ hàng
    else {
      return checkoutService.initiateCartCheckout(buyerId, {
        paymentMethod,
        redirectUrl: clientRedirectUrl,
      });
    }
  },

  // Logic xử lý thanh toán giỏ hàng
  initiateCartCheckout: async (
    buyerId: string,
    {
      paymentMethod,
      redirectUrl: clientRedirectUrl,
    }: {
      paymentMethod: PaymentGateway;
      redirectUrl?: string;
    },
  ) => {
    const cart = await prisma.cart.findUnique({
      where: { userId: buyerId },
      include: { items: { include: { battery: true } } },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestError("Your cart is empty.");
    }

    // Nhóm các sản phẩm theo người bán
    const itemsBySeller = cart.items.reduce(
      (acc, item) => {
        const sellerId = item.battery.sellerId;
        if (!acc[sellerId]) {
          acc[sellerId] = [];
        }
        acc[sellerId].push(item);
        return acc;
      },
      {} as Record<string, typeof cart.items>,
    );

    // Tạo một "meta-transaction" để gom các giao dịch con và tổng số tiền
    const totalAmount = cart.items.reduce(
      (sum, item) => sum + item.battery.price,
      0,
    );
    const parentTransaction = await prisma.transaction.create({
      data: {
        buyerId,
        finalPrice: totalAmount,
        paymentGateway: paymentMethod,
        listingType: "BATTERY", // Đánh dấu đây là giao dịch cho pin
        type: "SALE",
        // Tạo các giao dịch con cho mỗi người bán
        childTransactions: {
          create: Object.entries(itemsBySeller).map(([_, items]) => ({
            buyerId,
            finalPrice: items.reduce(
              (sum, item) => sum + item.battery.price,
              0,
            ),
            listingType: "BATTERY",
            type: "SALE",
            paymentGateway: "INTERNAL", // Giao dịch con được thanh toán qua giao dịch cha
            batteries: {
              connect: items.map((item) => ({ id: item.batteryId })),
            },
          })),
        },
      },
    });

    // Xóa giỏ hàng sau khi tạo giao dịch
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Bắt đầu quy trình thanh toán cho tổng số tiền
    if (paymentMethod === "WALLET") {
      // ... xử lý thanh toán bằng ví cho parentTransaction
    } else if (paymentMethod === "MOMO") {
      const ipnUrl = `${config.SERVER_URL}/payments/momo/ipn`;
      const redirectUrl =
        clientRedirectUrl || `${config.CLIENT_URL}/profile/transactions`;
      const paymentInfo = await momoService.createPayment({
        orderId: parentTransaction.id, // Sử dụng ID của giao dịch cha
        amount: totalAmount,
        orderInfo: `Thanh toan don hang EVmarket`,
        redirectUrl,
        ipnUrl,
      });
      return { paymentUrl: paymentInfo.payUrl, transaction: parentTransaction };
    }
    return parentTransaction;
  },

  // Logic mua một sản phẩm (đã được tái cấu trúc từ code cũ)
  initiateSingleItemCheckout: async (
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

    const priceToPay =
      listingType === "VEHICLE" ? listing.price * 0.1 : listing.price;

    const transaction = await prisma.transaction.create({
      data: {
        buyerId,
        finalPrice: priceToPay,
        paymentGateway: paymentMethod,
        listingType: listingType,
        ...(listingType === "VEHICLE"
          ? { vehicleId: listingId }
          : { batteryId: listingId }),
      },
    });

    if (paymentMethod === "WALLET") {
      const wallet = await prisma.wallet.findUnique({
        where: { userId: buyerId },
      });
      if (!wallet || wallet.availableBalance < priceToPay) {
        throw new BadRequestError(
          "Insufficient wallet balance. Please top up.",
        );
      }
      // SỬA LỖI: Gọi payWithWallet ngay lập tức để xử lý thanh toán và tạo hợp đồng
      await checkoutService.payWithWallet(transaction.id, buyerId);
      return { transactionId: transaction.id, paymentInfo: null };
    }

    const ipnUrl = `${config.SERVER_URL}/payments/momo/ipn`;
    const redirectUrl =
      clientRedirectUrl || `${config.CLIENT_URL}/profile/transactions`;
    const paymentInfo = await momoService.createPayment({
      orderId: transaction.id,
      amount: priceToPay,
      orderInfo: `Thanh toan cho san pham ${listing.title}`,
      redirectUrl,
      ipnUrl,
    });

    return { paymentUrl: paymentInfo.payUrl, transaction };
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
      return checkoutService.payWithWallet(transactionId, buyerId);
    }

    if (paymentMethod === "MOMO") {
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

      // Trừ tiền từ ví người mua và khóa tiền cho người bán
      await walletService.updateBalance(buyerId, -price, "PURCHASE", tx);
      await walletService.addLockedBalance(listing.sellerId, price, tx);

      // Nếu là giao dịch đặt cọc xe
      if (transaction.listingType === "VEHICLE") {
        const appointmentDeadline = new Date();
        appointmentDeadline.setDate(appointmentDeadline.getDate() + 7);

        await tx.appointment.create({
          data: {
            transactionId: transaction.id,
            buyerId: transaction.buyerId,
            sellerId: listing.sellerId,
            vehicleId: transaction.vehicleId,
          },
        });

        await tx.vehicle.update({
          where: { id: transaction.vehicleId! },
          data: { status: "RESERVED" },
        });

        return tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: "DEPOSIT_PAID",
            isDepositPaid: true,
            appointmentDeadline: appointmentDeadline,
          },
          include: {
            vehicle: { include: { seller: true } },
            battery: { include: { seller: true } },
            buyer: true,
          },
        });
      }

      // Nếu là giao dịch mua pin (luồng cũ)
      const model = transaction.vehicleId ? tx.vehicle : tx.battery;
      await (model as any).update({
        where: { id: listing.id },
        data: { status: "SOLD" },
      });

      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: "PAID" },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });
    });

    // Gửi email và hợp đồng sau khi transaction thành công
    if (completedTransaction) {
      await checkoutService.postPaymentActions(completedTransaction);
    }

    return completedTransaction;
  },

  payRemainderForVehicle: async (
    buyerId: string,
    transactionId: string,
    paymentMethod: PaymentGateway,
    clientRedirectUrl?: string,
  ) => {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        buyerId,
        status: "APPOINTMENT_SCHEDULED",
        listingType: "VEHICLE",
      },
      include: { vehicle: true },
    });

    if (!transaction || !transaction.vehicle) {
      throw new NotFoundError(
        "Transaction not found or not in a payable state.",
      );
    }

    const remainderAmount = transaction.vehicle.price * 0.9;

    if (paymentMethod === "WALLET") {
      // Logic thanh toán bằng ví cho 90% còn lại
      const completedTx = await transactionService.completeVehiclePurchase(
        transactionId,
        remainderAmount,
      );
      return { paymentUrl: null, transaction: completedTx };
    } else {
      // Logic thanh toán bằng MoMo cho 90% còn lại
      const ipnUrl = `${config.SERVER_URL}/payments/momo/ipn`;
      const redirectUrl =
        clientRedirectUrl || `${config.CLIENT_URL}/profile/transactions`;

      const paymentInfo = await momoService.createPayment({
        // Sử dụng một orderId mới hoặc một định dạng khác để phân biệt
        orderId: `${transaction.id}-remainder`,
        amount: remainderAmount,
        orderInfo: `Thanh toan phan con lai cho xe ${transaction.vehicle.title}`,
        redirectUrl,
        ipnUrl,
      });

      // Không thay đổi trạng thái giao dịch ở đây, chờ IPN từ MoMo
      return { paymentUrl: paymentInfo.payUrl, transaction };
    }
  },

  completeMomoPurchase: async (
    orderId: string, // Sẽ có dạng 'uuid' hoặc 'uuid-remainder'
    paidAmount: number,
  ) => {
    const isRemainderPayment = orderId.endsWith("-remainder");
    const transactionId = isRemainderPayment
      ? orderId.split("-remainder")[0]
      : orderId;

    // Nếu là thanh toán 90% còn lại
    if (isRemainderPayment) {
      logger.info(
        `Processing remainder payment for transaction ${transactionId}`,
      );
      return transactionService.completeVehiclePurchase(
        transactionId,
        paidAmount,
      );
    }

    // Logic cũ cho thanh toán cọc và mua pin
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

      if (transaction.finalPrice !== paidAmount) {
        // For vehicle deposit, the finalPrice is the deposit amount
        if (
          transaction.listingType !== "VEHICLE" ||
          transaction.finalPrice !== paidAmount
        ) {
          throw new BadRequestError(
            "Paid amount does not match transaction price.",
          );
        }
      }

      await walletService.addLockedBalance(listing.seller.id, paidAmount, tx);

      // Nếu là giao dịch đặt cọc xe
      if (transaction.listingType === "VEHICLE") {
        const appointmentDeadline = new Date();
        appointmentDeadline.setDate(appointmentDeadline.getDate() + 7);

        await tx.appointment.create({
          data: {
            transactionId: transaction.id,
            buyerId: transaction.buyerId,
            sellerId: listing.sellerId,
            vehicleId: transaction.vehicleId,
          },
        });

        await tx.vehicle.update({
          where: { id: transaction.vehicleId! },
          data: { status: "RESERVED" },
        });

        return tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: "DEPOSIT_PAID",
            isDepositPaid: true,
            appointmentDeadline: appointmentDeadline,
          },
          include: {
            vehicle: { include: { seller: true } },
            battery: { include: { seller: true } },
            buyer: true,
          },
        });
      }

      // Nếu là giao dịch mua pin (luồng cũ)
      const model = transaction.vehicleId ? tx.vehicle : tx.battery;
      await (model as any).update({
        where: { id: listing.id },
        data: { status: "SOLD" },
      });

      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: "PAID" },
        include: {
          vehicle: { include: { seller: true } },
          battery: { include: { seller: true } },
          buyer: true,
        },
      });
    });

    if (updatedTransaction) {
      await checkoutService.postPaymentActions(updatedTransaction);
    }

    logger.info(`Transaction ${transactionId} processing finished.`);
    return updatedTransaction;
  },

  // Hàm helper để xử lý các tác vụ sau thanh toán
  postPaymentActions: async (transaction: any) => {
    try {
      const pdfBuffer =
        await contractService.generateAndSaveContract(transaction);
      logger.info(`Contract generated for transaction ${transaction.id}`);

      const seller = transaction.vehicle?.seller || transaction.battery?.seller;

      if (seller && pdfBuffer) {
        // Gửi email hợp đồng cho cả 2 bên
        await Promise.all([
          emailService.sendContractEmail(
            transaction.buyer.email,
            transaction.buyer.name,
            transaction.id,
            Buffer.from(pdfBuffer),
          ),
          emailService.sendContractEmail(
            seller.email,
            seller.name,
            transaction.id,
            Buffer.from(pdfBuffer),
          ),
        ]);
      }

      // Nếu là đặt cọc xe, gửi thêm email hướng dẫn đặt lịch hẹn
      if (
        transaction.listingType === "VEHICLE" &&
        transaction.status === "DEPOSIT_PAID"
      ) {
        // TODO: Tạo và gửi email hướng dẫn đặt lịch hẹn
        logger.info(
          `Sent appointment scheduling instructions for transaction ${transaction.id}`,
        );
      }
    } catch (error) {
      logger.error(
        `Failed to run post-payment actions for transaction ${transaction.id}`,
        error,
      );
    }
  },
};
