/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import {
  Battery,
  ListingStatus,
  ListingType,
  Prisma,
  User,
  UserRole,
  Vehicle,
} from "@prisma/client";

/**
 * Services
 */
import { walletService } from "@/services/wallet.service";
import { emailService } from "@/services/email.service";
import { transactionService } from "@/services/transaction.service";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import redisClient from "@/libs/redis";
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from "@/libs/error";

/**
 * Types
 */
import { IQueryOptions } from "@/types/pagination.type";

const AUCTION_REJECTION_EXPIRY = 24 * 60 * 60;

export const adminService = {
  getDashboardStats: async () => {
    const totalUsers = await prisma.user.count({
      where: { role: "MEMBER" },
    });

    const totalVehicles = await prisma.vehicle.count();
    const totalBatteries = await prisma.battery.count();
    const totalListings = totalVehicles + totalBatteries;

    const pendingVerificationVehicles = await prisma.vehicle.count({
      where: { isVerified: false, status: "AVAILABLE" },
    });
    const pendingVerificationBatteries = await prisma.battery.count({
      where: { isVerified: false, status: "AVAILABLE" },
    });
    const pendingListings =
      pendingVerificationVehicles + pendingVerificationBatteries;

    const pendingAuctionVehicles = await prisma.vehicle.count({
      where: { status: "AUCTION_PENDING_APPROVAL" },
    });
    const pendingAuctionBatteries = await prisma.battery.count({
      where: { status: "AUCTION_PENDING_APPROVAL" },
    });
    const pendingAuctions = pendingAuctionVehicles + pendingAuctionBatteries;

    const totalTransactions = await prisma.transaction.count({
      where: { status: "COMPLETED" },
    });

    const systemWallet = await prisma.wallet.findFirst({
      where: { user: { email: "system@evmarket.local" } },
    });
    const totalRevenue = systemWallet?.availableBalance || 0;

    return {
      totalUsers,
      totalListings,
      pendingListings,
      pendingAuctions,
      totalTransactions,
      totalRevenue,
    };
  },
  resolveDispute: async (transactionId: string, approved: boolean) => {
    if (approved) {
      // Admin đồng ý với người mua -> Hoàn tiền
      return prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId },
          include: { vehicle: true, battery: true },
        });

        if (!transaction || transaction.status !== "DISPUTED") {
          throw new BadRequestError("Transaction cannot be refunded.");
        }
        const listing = transaction.vehicle || transaction.battery;
        if (!listing) throw new InternalServerError("Listing not found");

        if (transaction.finalPrice === null) {
          throw new InternalServerError(
            "Cannot resolve dispute: transaction is missing final price.",
          );
        }

        await walletService.refundToBuyer(
          transaction.buyerId,
          listing.sellerId,
          transaction.finalPrice,
          tx,
        );

        return tx.transaction.update({
          where: { id: transactionId },
          data: { status: "REFUNDED" },
        });
      });
    } else {
      // Admin không đồng ý -> Hoàn tất giao dịch cho người bán
      return transactionService.completeTransaction(transactionId);
    }
  },
  getPendingAuctionRequests: async (
    options: IQueryOptions & { status?: string },
  ) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
    } = options;
    const skip = (page - 1) * limit;

    const auctionStatuses = [
      "AUCTION_PENDING_APPROVAL",
      "AUCTION_REJECTED",
      "AUCTION_LIVE",
      "AUCTION_ENDED",
      "AUCTION_PAYMENT_PENDING",
    ] as const;

    let commonWhere: any;
    if (status && status !== "ALL") {
      commonWhere = { status: status as any };
    } else {
      commonWhere = { status: { in: auctionStatuses as any } };
    }

    const pendingVehicles = await prisma.vehicle.findMany({
      where: commonWhere,
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    });

    const pendingBatteries = await prisma.battery.findMany({
      where: commonWhere,
      include: { seller: { select: { id: true, name: true, avatar: true } } },
    });

    const allPendingRequests = [
      ...pendingVehicles.map((v) => ({ ...v, listingType: "VEHICLE" })),
      ...pendingBatteries.map((b) => ({ ...b, listingType: "BATTERY" })),
    ];

    allPendingRequests.sort((a, b) => {
      const dateA = new Date((a as any)[sortBy] as string).getTime();
      const dateB = new Date((b as any)[sortBy] as string).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });

    const paginatedResults = allPendingRequests.slice(skip, skip + limit);
    const totalResults = allPendingRequests.length;

    return {
      requests: paginatedResults,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  reviewAuctionRequest: async (
    listingType: ListingType,
    listingId: string,
    payload: {
      approved: boolean;
      rejectionReason?: string;
      auctionStartsAt?: string;
      auctionEndsAt?: string;
    },
  ) => {
    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;
    const redisKey = `auction-rejection:${listingType}:${listingId}`;

    const listing = await (model as any).findUnique({
      where: { id: listingId },
    });

    if (!listing || listing.status !== "AUCTION_PENDING_APPROVAL") {
      throw new NotFoundError(
        "Auction request not found or already processed.",
      );
    }

    if (payload.approved) {
      await redisClient.del(redisKey);

      return (model as any).update({
        where: { id: listingId },
        data: {
          status: "AUCTION_LIVE",
          isVerified: true,
          auctionRejectionReason: null,
          auctionStartsAt: payload.auctionStartsAt,
          auctionEndsAt: payload.auctionEndsAt,
        },
      });
    } else {
      if (!payload.rejectionReason) {
        throw new BadRequestError("Rejection reason is required.");
      }

      const newCount = await redisClient.incr(redisKey);
      if (newCount === 1) {
        await redisClient.expire(redisKey, AUCTION_REJECTION_EXPIRY);
      }

      return (model as any).update({
        where: { id: listingId },
        data: {
          status: "AUCTION_REJECTED",
          auctionRejectionReason: payload.rejectionReason,
        },
      });
    }
  },
  getUsers: async (
    filter: { role?: UserRole; isLocked?: boolean; search?: string },
    options: IQueryOptions,
  ) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (filter.role) {
      where.role = filter.role;
    }
    if (filter.isLocked !== undefined) {
      where.isLocked = filter.isLocked;
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { email: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [users, totalResults] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          role: true,
          isVerified: true,
          isLocked: true,
          lockReason: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  lockUser: async (userId: string, lockReason: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    if (user.role === "ADMIN") {
      throw new ForbiddenError("Cannot lock an admin account.");
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: true,
        lockReason,
      },
    });

    await emailService.sendAccountLockedEmail(
      updatedUser.email,
      updatedUser.name,
      lockReason,
    );

    return updatedUser;
  },
  unlockUser: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: false,
        lockReason: null,
      },
    });
  },
  getListings: async (
    filter: {
      listingType?: "VEHICLE" | "BATTERY" | "ALL";
      isVerified?: boolean;
      status?: ListingStatus;
    },
    options: IQueryOptions,
  ) => {
    const { limit = 10, page = 1 } = options;
    const skip = (page - 1) * limit;

    const where: Prisma.VehicleWhereInput & Prisma.BatteryWhereInput = {};
    if (filter.isVerified !== undefined) {
      where.isVerified = filter.isVerified;
    }
    if (filter.status) {
      where.status = filter.status;
    }

    const getVehicles =
      filter.listingType === "ALL" || filter.listingType === "VEHICLE";
    const getBatteries =
      filter.listingType === "ALL" || filter.listingType === "BATTERY";

    const [vehicleResults, batteryResults, totalVehicles, totalBatteries] =
      await Promise.all([
        getVehicles
          ? prisma.vehicle.findMany({
              where,
              skip,
              take: limit,
              include: { seller: true },
            })
          : Promise.resolve([]),
        getBatteries
          ? prisma.battery.findMany({
              where,
              skip,
              take: limit,
              include: { seller: true },
            })
          : Promise.resolve([]),
        getVehicles ? prisma.vehicle.count({ where }) : Promise.resolve(0),
        getBatteries ? prisma.battery.count({ where }) : Promise.resolve(0),
      ]);

    const combinedResults = [
      ...vehicleResults.map((v: Vehicle & { seller: User }) => ({
        ...v,
        type: "VEHICLE" as const,
      })),
      ...batteryResults.map((b: Battery & { seller: User }) => ({
        ...b,
        type: "BATTERY" as const,
      })),
    ];
    const totalResults = totalVehicles + totalBatteries;

    return {
      listings: combinedResults,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  verifyListing: async (
    listingType: ListingType,
    listingId: string,
    payload: { isVerified: boolean },
  ) => {
    const model = listingType === "VEHICLE" ? prisma.vehicle : prisma.battery;

    const listing = await (model as any).findUnique({
      where: { id: listingId },
      include: { seller: true },
    });
    if (!listing) {
      throw new NotFoundError("Listing not found.");
    }

    const updatedListing = await (model as any).update({
      where: { id: listingId },
      data: {
        isVerified: payload.isVerified,
      },
    });

    await emailService.sendListingVerifiedEmail(
      listing.seller.email,
      listing.seller.name,
      listing.title,
      payload.isVerified,
    );

    return updatedListing;
  },
  getFees: async () => {
    return prisma.fee.findMany({
      orderBy: {
        type: "asc",
      },
    });
  },
  updateFee: async (
    feeId: string,
    payload: {
      percentage: number;
      description?: string;
      isActive?: boolean;
    },
  ) => {
    const fee = await prisma.fee.findUnique({ where: { id: feeId } });
    if (!fee) {
      throw new NotFoundError("Fee configuration not found.");
    }

    return prisma.fee.update({
      where: { id: feeId },
      data: payload,
    });
  },
  getDisputedTransactions: async (options: IQueryOptions) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = options;
    const skip = (page - 1) * limit;

    const [transactions, totalResults] = await prisma.$transaction([
      prisma.transaction.findMany({
        where: { status: "DISPUTED" },
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          vehicle: {
            select: {
              id: true,
              title: true,
              seller: { select: { id: true, name: true, email: true } },
            },
          },
          battery: {
            select: {
              id: true,
              title: true,
              seller: { select: { id: true, name: true, email: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.transaction.count({ where: { status: "DISPUTED" } }),
    ]);

    return {
      transactions,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  getContracts: async (options: IQueryOptions) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;
    const skip = (page - 1) * limit;

    const [contracts, totalResults] = await prisma.$transaction([
      prisma.contract.findMany({
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
          transaction: {
            select: {
              id: true,
              finalPrice: true,
              status: true,
              vehicle: { select: { title: true } },
              battery: { select: { title: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.contract.count(),
    ]);
    return {
      contracts,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
  getAppointments: async (options: IQueryOptions) => {
    const {
      limit = 10,
      page = 1,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = options;
    const skip = (page - 1) * limit;

    const [appointments, totalResults] = await prisma.$transaction([
      prisma.appointment.findMany({
        include: {
          buyer: { select: { id: true, name: true, email: true } },
          seller: { select: { id: true, name: true, email: true } },
          transaction: {
            select: {
              id: true,
              status: true,
              vehicle: { select: { id: true, title: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      prisma.appointment.count(),
    ]);
    return {
      appointments,
      page,
      limit,
      totalPages: Math.ceil(totalResults / limit),
      totalResults,
    };
  },
};
