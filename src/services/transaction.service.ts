/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { BadRequestError, NotFoundError } from "@/libs/error";

export const transactionService = {
  createTransaction: async (
    buyerId: string,
    vehicleId?: string,
    batteryId?: string,
  ) => {
    if (!vehicleId && !batteryId) {
      throw new BadRequestError("Must provide vehicleId or batteryId");
    }
    // let sellerId: string | undefined;
    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });
      if (!vehicle) throw new NotFoundError("Vehicle not found");
      //   sellerId = vehicle.sellerId;
    }
    if (batteryId) {
      const battery = await prisma.battery.findUnique({
        where: { id: batteryId },
      });
      if (!battery) throw new NotFoundError("Battery not found");
      //   sellerId = battery.sellerId;
    }
    const transaction = await prisma.transaction.create({
      data: {
        buyerId,
        vehicleId,
        batteryId,
        status: "PENDING",
      },
    });
    return transaction;
  },
  completeTransaction: async (transactionId: string) => {
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "COMPLETED" },
    });
    return transaction;
  },
  getTransactionsByBuyer: async (buyerId: string) => {
    return prisma.transaction.findMany({
      where: { buyerId },
      include: {
        vehicle: true,
        battery: true,
        review: true,
      },
    });
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
};
