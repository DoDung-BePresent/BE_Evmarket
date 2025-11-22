/**
 * Node modules
 */
import { add } from "date-fns";

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
import { supabase } from "@/libs/supabase";

/**
 * Services
 */
import { walletService } from "@/services/wallet.service";

/**
 * Types
 */
import { IQueryOptions } from "@/types/pagination.type";

/**
 * Constants
 */
import { SUPABASE_BUCKETS } from "@/constants/supabase.constant";

export const transactionService = {
  createTransaction: async (
    buyerId: string,
    vehicleId?: string,
    batteryId?: string,
  ) => {
    if (!vehicleId && !batteryId) {
      throw new BadRequestError("Must provide vehicleId or batteryId");
    }

    let listingType: "VEHICLE" | "BATTERY";

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });
      if (!vehicle) throw new NotFoundError("Vehicle not found");
      listingType = "VEHICLE";
    } else {
      const battery = await prisma.battery.findUnique({
        where: { id: batteryId! },
      });
      if (!battery) throw new NotFoundError("Battery not found");
      listingType = "BATTERY";
    }

    const transaction = await prisma.transaction.create({
      data: {
        buyerId,
        vehicleId,
        batteryId,
        status: "PENDING",
        listingType: listingType, // Thêm trường listingType bị thiếu
      },
    });
    return transaction;
  },
  shipTransaction: async (transactionId: string, sellerId: string) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        vehicle: { select: { sellerId: true } },
        battery: { select: { sellerId: true } },
        batteries: { select: { sellerId: true } }, // Quan trọng: include cả batteries
      },
    });

    if (!transaction) {
      throw new NotFoundError("Transaction not found.");
    }

    if (transaction.listingType !== "BATTERY") {
      throw new BadRequestError("This type of transaction cannot be shipped.");
    }

    // Logic kiểm tra quyền sở hữu mới, đã sửa lỗi
    let isSellerOfThisTransaction = false;
    if (transaction.battery) {
      // Đơn hàng mua 1 pin lẻ
      isSellerOfThisTransaction = transaction.battery.sellerId === sellerId;
    } else if (transaction.batteries && transaction.batteries.length > 0) {
      // Đơn hàng từ giỏ hàng (chứa nhiều pin)
      isSellerOfThisTransaction =
        transaction.batteries[0].sellerId === sellerId;
    }

    if (!isSellerOfThisTransaction) {
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
    files: Express.Multer.File[] = [],
  ) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { batteries: true },
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

    // Tải ảnh lên Supabase
    const imageUrls: string[] = [];
    if (files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const fileName = `${transactionId}/${Date.now()}-${file.originalname}`;
        const { data, error } = await supabase.storage
          .from(SUPABASE_BUCKETS.DISPUTES)
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
          });

        if (error) {
          throw new InternalServerError(
            `Failed to upload dispute image: ${error.message}`,
          );
        }
        const { data: urlData } = supabase.storage
          .from(SUPABASE_BUCKETS.DISPUTES)
          .getPublicUrl(data.path);
        imageUrls.push(urlData.publicUrl);
      });
      await Promise.all(uploadPromises);
    }

    return prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "DISPUTED",
        disputeReason: reason,
        disputeImages: imageUrls, // Lưu lại mảng URL ảnh
      },
    });
  },

  completeTransaction: async (transactionId: string) => {
    return prisma.$transaction(
      async (tx) => {
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId },
          include: { vehicle: true, battery: true, batteries: true },
        });

        if (
          !transaction ||
          (transaction.status !== "SHIPPED" && transaction.status !== "PAID")
        ) {
          throw new BadRequestError("Transaction cannot be completed.");
        }

        // SỬA LỖI: Xử lý đúng cả giao dịch đơn lẻ và giao dịch con từ giỏ hàng
        const priceToUse = transaction.finalPrice;
        if (priceToUse === null) {
          throw new InternalServerError("Transaction is missing final price.");
        }

        // Xác định người bán và sản phẩm
        let sellerId: string;
        let isAuction: boolean = false;

        if (transaction.vehicle) {
          // Trường hợp: Giao dịch mua xe
          sellerId = transaction.vehicle.sellerId;
          isAuction = transaction.vehicle.isAuction;
        } else if (transaction.battery) {
          // Trường hợp: Giao dịch mua 1 pin lẻ
          sellerId = transaction.battery.sellerId;
          isAuction = transaction.battery.isAuction;
        } else if (transaction.batteries && transaction.batteries.length > 0) {
          // Trường hợp: Giao dịch con từ giỏ hàng (nhiều pin cùng người bán)
          sellerId = transaction.batteries[0].sellerId;
          isAuction = transaction.batteries[0].isAuction;

          const allSameSeller = transaction.batteries.every(
            (b) => b.sellerId === sellerId,
          );
          if (!allSameSeller) {
            throw new InternalServerError(
              "Child transaction contains batteries from multiple sellers.",
            );
          }
        } else {
          throw new InternalServerError("Listing not found for transaction");
        }

        // Tính hoa hồng dựa trên giá trị thực tế của giao dịch
        const feeRule = await tx.fee.findUnique({
          where: {
            type: isAuction ? "AUCTION_SALE" : "REGULAR_SALE",
          },
        });

        const commission = (priceToUse * (feeRule?.percentage || 0)) / 100;
        const sellerRevenue = priceToUse - commission;

        // SỬA LỖI CHÍNH: Thu hoa hồng vào ví hệ thống
        await walletService.addCommissionFeeToSystemWallet(commission, tx);

        // Giải ngân cho người bán (SAU KHI ĐÃ TRỪ hoa hồng)
        await walletService.releaseLockedBalance(
          sellerId,
          priceToUse,
          sellerRevenue,
          tx,
        );

        return tx.transaction.update({
          where: { id: transactionId },
          data: { status: "COMPLETED" },
        });
      },
      {
        timeout: 15000,
      },
    );
  },

  getTransactionsBySeller: async (sellerId: string, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    const whereClause = {
      childTransactions: {
        // Điều kiện mới: Lấy các giao dịch mà người bán này có liên quan,
        // và loại bỏ các giao dịch cha (giao dịch tổng của giỏ hàng).
        none: {}, // Lọc bỏ các giao dịch cha
      },
      OR: [
        { vehicle: { sellerId: sellerId } }, // Bán xe
        { battery: { sellerId: sellerId } }, // Bán 1 pin lẻ
        { batteries: { some: { sellerId: sellerId } } }, // Bán nhiều pin qua giỏ hàng
      ],
    };

    const [transactions, totalResults] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          vehicle: { select: { title: true, images: true } },
          battery: { select: { title: true, images: true } },
          batteries: { select: { title: true, images: true } }, // Include cả batteries
          buyer: { select: { name: true, avatar: true } }, // Người bán cần xem thông tin người mua
        },
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
      }),
      prisma.transaction.count({ where: whereClause }),
    ]);

    return {
      transactions,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },

  getTransactionsByBuyer: async (buyerId: string, options: IQueryOptions) => {
    const { limit = 10, page = 1, sortBy, sortOrder = "desc" } = options;
    const skip = (page - 1) * limit;

    // Điều kiện mới: Chỉ lấy các giao dịch là đơn hàng thực tế,
    // không lấy giao dịch cha (giao dịch tổng của giỏ hàng).
    const whereClause = {
      buyerId,
      // Giao dịch cha sẽ có childTransactions, chúng ta không lấy nó.
      // Chúng ta chỉ lấy các giao dịch không có con (đơn lẻ) hoặc có cha (là con).
      // Cách đơn giản nhất là lọc bỏ các giao dịch có finalPrice nhưng không có sản phẩm nào gắn vào.
      // Tuy nhiên, cách tiếp cận tốt hơn là chỉ lấy các giao dịch có sản phẩm.
      // Hoặc đơn giản hơn, chỉ lấy các giao dịch không phải là cha.
      // Một giao dịch cha là giao dịch có childTransactions.
      childTransactions: {
        none: {}, // Lọc bỏ tất cả các giao dịch cha
      },
    };

    const [transactions, totalResults] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: whereClause,
        include: {
          vehicle: { select: { title: true, images: true } },
          // Include cả 2 mối quan hệ để lấy đủ thông tin pin
          battery: { select: { title: true, images: true } }, // Cho đơn hàng lẻ
          batteries: { select: { title: true, images: true } }, // Cho đơn hàng từ giỏ hàng
        },
        skip,
        take: limit,
        orderBy: sortBy ? { [sortBy]: sortOrder } : { createdAt: "desc" },
      }),
      prisma.transaction.count({ where: whereClause }),
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

  completeVehiclePurchase: async (
    transactionId: string,
    paidAmount: number,
  ) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { vehicle: true },
      });

      if (
        !transaction ||
        !transaction.vehicle ||
        transaction.status !== "APPOINTMENT_SCHEDULED"
      ) {
        throw new NotFoundError("Transaction cannot be completed.");
      }

      const expectedAmount = transaction.vehicle.price * 0.9;
      // Cho phép sai số nhỏ để tránh lỗi float
      if (Math.abs(expectedAmount - paidAmount) > 1) {
        throw new BadRequestError("Incorrect payment amount for remainder.");
      }

      // Lấy tổng giá trị của xe
      const totalVehiclePrice = transaction.vehicle.price;

      // SỬA LỖI: Khóa số tiền 90% vừa thanh toán vào lockedBalance của người bán
      await walletService.addLockedBalance(
        transaction.vehicle.sellerId,
        paidAmount,
        tx,
      );

      // Tìm quy tắc tính phí và tính hoa hồng
      const feeRule = await tx.fee.findUnique({
        where: { type: "REGULAR_SALE" },
      });
      const commissionPercentage = feeRule?.percentage || 0;
      const commissionAmount = (totalVehiclePrice * commissionPercentage) / 100;

      // Thu hoa hồng cho hệ thống
      await walletService.addCommissionFeeToSystemWallet(commissionAmount, tx);

      // Giải ngân cho người bán
      // Lúc này lockedBalance của seller = 10% (cọc) + 90% (vừa khóa) = 100%
      await walletService.releaseFunds(
        transaction.vehicle.sellerId,
        totalVehiclePrice, // totalLockedAmount = 100% giá trị xe
        totalVehiclePrice - commissionAmount, // revenueToReceive = 100% - hoa hồng
        tx,
      );

      // Cập nhật trạng thái xe và giao dịch
      await tx.vehicle.update({
        where: { id: transaction.vehicleId! },
        data: { status: "SOLD" },
      });

      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" }, // Chuyển thẳng sang COMPLETED
      });
    });
  },

  rejectVehiclePurchase: async (transactionId: string, buyerId: string) => {
    return prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id: transactionId },
        include: { vehicle: true },
      });

      if (!transaction || !transaction.vehicle) {
        throw new NotFoundError("Transaction not found.");
      }
      if (transaction.buyerId !== buyerId) {
        throw new ForbiddenError("You are not the buyer of this transaction.");
      }
      if (transaction.status !== "APPOINTMENT_SCHEDULED") {
        throw new BadRequestError(
          "This transaction cannot be rejected at its current state.",
        );
      }

      // Hoàn lại tiền cọc (10%) cho người mua
      const depositAmount = transaction.vehicle.price * 0.1;
      await walletService.refundToBuyer(
        buyerId,
        transaction.vehicle.sellerId,
        depositAmount,
        tx,
      );
      // Mở bán lại xe
      await tx.vehicle.update({
        where: { id: transaction.vehicleId! },
        data: { status: "AVAILABLE" },
      });

      // Hủy giao dịch
      return tx.transaction.update({
        where: { id: transactionId },
        data: { status: "CANCELLED" },
      });
    });
  },
};
