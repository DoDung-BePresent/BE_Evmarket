/**
 * Node modules
 */
import { ListingType } from "@prisma/client";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/libs/error";

export const auctionService = {
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
    return prisma.$transaction(async (tx) => {
      // 1. Lấy thông tin sản phẩm đấu giá và người đặt giá
      let listing;
      if (listingType === "VEHICLE") {
        listing = await tx.vehicle.findUnique({ where: { id: listingId } });
      } else {
        listing = await tx.battery.findUnique({ where: { id: listingId } });
      }

      const bidderWallet = await tx.wallet.findUnique({
        where: { userId: bidderId },
      });

      if (!listing || !listing.isAuction) {
        throw new NotFoundError("Auction listing not found.");
      }
      if (!bidderWallet) {
        throw new NotFoundError("Bidder wallet not found.");
      }
      if (listing.status !== "AUCTION_LIVE") {
        throw new ForbiddenError("Auction is not live.");
      }

      // 2. Lấy giá bid cao nhất hiện tại
      const highestBid = await tx.bid.findFirst({
        where:
          listingType === "VEHICLE"
            ? { vehicleId: listingId }
            : { batteryId: listingId },
        orderBy: { amount: "desc" },
      });

      const currentHighestAmount =
        highestBid?.amount || listing.startingPrice || 0;
      const requiredAmount = currentHighestAmount + (listing.bidIncrement || 0);

      if (amount < requiredAmount) {
        throw new BadRequestError(
          `Your bid must be at least ${requiredAmount}`,
        );
      }

      // 3. Xử lý tiền cọc nếu đây là lần đầu người dùng bid
      const depositAmount = listing.depositAmount || 0;
      const hasAlreadyBid = await tx.bid.findFirst({
        where: {
          bidderId,
          ...(listingType === "VEHICLE"
            ? { vehicleId: listingId }
            : { batteryId: listingId }),
        },
      });

      if (!hasAlreadyBid && depositAmount > 0) {
        if (bidderWallet.availableBalance < depositAmount) {
          throw new BadRequestError("Insufficient balance to place a deposit.");
        }
        // Khóa tiền cọc
        await tx.wallet.update({
          where: { userId: bidderId },
          data: {
            availableBalance: { decrement: depositAmount },
            lockedBalance: { increment: depositAmount },
          },
        });
        // Ghi lại giao dịch tài chính
        await tx.financialTransaction.create({
          data: {
            walletId: bidderWallet.id,
            type: "AUCTION_DEPOSIT",
            amount: -depositAmount,
            status: "COMPLETED",
            gateway: "WALLET",
            description: `Deposit for auction of ${listing.title}`,
          },
        });
      }

      // 4. Tạo lượt bid mới
      const newBid = await tx.bid.create({
        data: {
          amount,
          bidderId,
          ...(listingType === "VEHICLE"
            ? { vehicleId: listingId }
            : { batteryId: listingId }),
        },
      });

      return newBid;
    });
  },
};
