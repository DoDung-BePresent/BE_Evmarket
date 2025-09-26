import prisma from "../../src/libs/prisma";

const createTransactions = async (count: number = 20) => {
  const users = await prisma.user.findMany({ select: { id: true } });
  const vehicles = await prisma.vehicle.findMany({ select: { id: true } });
  const batteries = await prisma.battery.findMany({ select: { id: true } });

  const transactions = [];

  // Seed transactions for vehicles
  for (let i = 0; i < Math.min(vehicles.length, users.length, count); i++) {
    const transaction = await prisma.transaction.create({
      data: {
        buyerId: users[i % users.length].id,
        vehicleId: vehicles[i].id,
        status: i % 2 === 0 ? "COMPLETED" : "PENDING",
      },
    });
    transactions.push(transaction);
  }

  // Seed transactions for batteries
  for (let i = 0; i < Math.min(batteries.length, users.length, count); i++) {
    const transaction = await prisma.transaction.create({
      data: {
        buyerId: users[(i + 5) % users.length].id,
        batteryId: batteries[i].id,
        status: i % 2 === 0 ? "COMPLETED" : "PENDING",
      },
    });
    transactions.push(transaction);
  }

  console.log(`✅ Seeded ${transactions.length} transactions`);
  return transactions;
};

const main = async () => {
  try {
    await createTransactions(25);
  } catch (error) {
    console.error("❌ Error seeding batteries:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main();
}

export { createTransactions };
