/**
 * Libs
 */
import prisma from "@/libs/prisma";
import { NotFoundError } from "@/libs/error";

export const userService = {
  getUserById: async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }
    return user;
  },
  getSellerProfileWithReviews: async (sellerId: string) => {
    const seller = await prisma.user.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        avatar: true,
        email: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!seller) throw new NotFoundError("Seller not found");

    const vehicles = await prisma.vehicle.findMany({
      where: { sellerId },
      select: { id: true, title: true },
    });
    const batteries = await prisma.battery.findMany({
      where: { sellerId },
      select: { id: true, title: true },
    });
    const vehicleIds = vehicles.map((v) => v.id);
    const batteryIds = batteries.map((b) => b.id);

    const reviewsRaw = await prisma.review.findMany({
      where: {
        transaction: {
          OR: [
            { vehicleId: { in: vehicleIds } },
            { batteryId: { in: batteryIds } },
          ],
        },
      },
      include: {
        transaction: {
          select: {
            vehicle: { select: { id: true, title: true } },
            battery: { select: { id: true, title: true } },
            buyer: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    const reviews = reviewsRaw.map((review) => {
      let type = "";
      let productId = "";
      let productTitle = "";
      if (review.transaction.vehicle) {
        type = "vehicle";
        productId = review.transaction.vehicle.id;
        productTitle = review.transaction.vehicle.title;
      } else if (review.transaction.battery) {
        type = "battery";
        productId = review.transaction.battery.id;
        productTitle = review.transaction.battery.title;
      }
      return {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        mediaUrls: review.mediaUrls,
        hasBeenEdited: review.hasBeenEdited,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
        type,
        productId,
        productTitle,
        buyer: review.transaction.buyer,
      };
    });

    return {
      seller,
      // vehicles,
      // batteries,
      reviews,
    };
  },
};
