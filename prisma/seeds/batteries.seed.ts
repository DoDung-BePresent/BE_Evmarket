/**
 * Node modules
 */
import { faker } from "@faker-js/faker";
import fs from "fs";
import path from "path";

/**
 * Libs
 */
import prisma from "../../src/libs/prisma";

interface BatterySeedConfig {
  available?: number;
  sold?: number;
}

const createBatteries = async (config: BatterySeedConfig = {}) => {
  const { available = 15, sold = 0 } = config;
  const totalCount = available + sold;

  console.log(`🔋 Seeding ${totalCount} batteries from JSON data...`);
  console.log(`   📊 AVAILABLE: ${available}`);
  console.log(`   📊 SOLD: ${sold}`);

  // Get all existing users to assign as sellers
  const users = await prisma.user.findMany({
    where: { role: "MEMBER" },
    select: { id: true },
  });

  if (users.length === 0) {
    throw new Error("No users found. Please seed users first.");
  }

  // Load real data from JSON file
  const dataPath = path.join(__dirname, "data", "batteries.json");
  const batteriesData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  if (batteriesData.length < totalCount) {
    throw new Error(
      `Not enough data in batteries.json. Required: ${totalCount}, Found: ${batteriesData.length}`,
    );
  }

  const batteriesToCreate = [];

  // Create AVAILABLE batteries
  for (let i = 0; i < available; i++) {
    batteriesToCreate.push({
      ...batteriesData[i],
      status: "AVAILABLE",
      isVerified: faker.datatype.boolean(0.8), // 80% chance of being verified
      sellerId: faker.helpers.arrayElement(users).id,
    });
  }

  // Create SOLD batteries
  for (let i = 0; i < sold; i++) {
    batteriesToCreate.push({
      ...batteriesData[available + i],
      status: "SOLD",
      isVerified: true, // Sold items are always verified
      sellerId: faker.helpers.arrayElement(users).id,
    });
  }

  // Create batteries in batches
  const batchSize = 8;
  const createdBatteries = [];

  for (let i = 0; i < batteriesToCreate.length; i += batchSize) {
    const batch = batteriesToCreate.slice(i, i + batchSize);
    const batchPromises = batch.map((battery) =>
      prisma.battery.create({
        data: battery,
        select: {
          id: true,
          title: true,
          brand: true,
          capacity: true,
          price: true,
          status: true,
        },
      }),
    );

    const batchResults = await Promise.all(batchPromises);
    createdBatteries.push(...batchResults);

    // Add a small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`✅ Successfully created ${createdBatteries.length} batteries`);
  return createdBatteries;
};

const main = async () => {
  try {
    await createBatteries({ available: 15, sold: 5 });
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

export { createBatteries };
