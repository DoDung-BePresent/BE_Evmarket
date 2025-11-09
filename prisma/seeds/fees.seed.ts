import prisma from "../../src/libs/prisma";
import { FeeType } from "@prisma/client";

export const createFees = async () => {
  console.log("🌱 Seeding fees...");

  await prisma.fee.upsert({
    where: { type: FeeType.REGULAR_SALE },
    update: {},
    create: {
      type: FeeType.REGULAR_SALE,
      percentage: 2.0,
      description: "Commission fee for regular product sales.",
    },
  });

  await prisma.fee.upsert({
    where: { type: FeeType.AUCTION_SALE },
    update: {},
    create: {
      type: FeeType.AUCTION_SALE,
      percentage: 3.0,
      description: "Commission fee for auctioned product sales.",
    },
  });

  console.log("✅ Fees seeded successfully.");
};
