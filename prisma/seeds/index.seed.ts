/**
 * Libs
 */
import prisma from "../../src/libs/prisma";
import { createSellers, createSpecialUsers } from "./users.seed";
import { createVehicles } from "./vehicles.seed";
import { createBatteries } from "./batteries.seed";

const seedAll = async () => {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Clear existing data (optional, be careful in production!)
    console.log("🧹 Cleaning existing data...");
    await prisma.battery.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    console.log("✅ Cleaned existing data\n");

    // Seed users first (they're needed for vehicles and batteries)
    await createSpecialUsers();
    await createSellers(15);
    console.log("");

    // Seed vehicles and batteries with specific status counts
    await Promise.all([
      createVehicles({
        available: 30,
        sold: 20,
        delisted: 10,
      }),
      createBatteries({
        available: 25,
        sold: 15,
        delisted: 5,
      }),
    ]);

    console.log("\n🎉 Database seeding completed successfully!");

    // Show summary
    const summary = await Promise.all([
      prisma.user.count(),
      prisma.vehicle.count(),
      prisma.battery.count(),
    ]);

    console.log("\n📊 Seeding Summary:");
    console.log(`   👥 Users: ${summary[0]}`);
    console.log(`   🚗 Vehicles: ${summary[1]}`);
    console.log(`   🔋 Batteries: ${summary[2]}`);
  } catch (error) {
    console.error("❌ Error during seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  seedAll();
}

export { seedAll };
