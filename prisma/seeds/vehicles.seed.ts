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

interface VehicleSeedConfig {
  available?: number;
  sold?: number;
}

const createVehicles = async (config: VehicleSeedConfig = {}) => {
  const { available = 20, sold = 0 } = config;
  const totalCount = available + sold;

  console.log(`🚗 Seeding ${totalCount} vehicles from JSON data...`);
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
  const dataPath = path.join(__dirname, "data", "vehicles.json");
  const vehiclesData = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  if (vehiclesData.length < totalCount) {
    throw new Error(
      `Not enough data in vehicles.json. Required: ${totalCount}, Found: ${vehiclesData.length}`,
    );
  }

  const vehiclesToCreate = [];

  // Create AVAILABLE vehicles
  for (let i = 0; i < available; i++) {
    vehiclesToCreate.push({
      ...vehiclesData[i],
      status: "AVAILABLE",
      isVerified: faker.datatype.boolean(0.8), // 80% chance of being verified
      sellerId: faker.helpers.arrayElement(users).id,
    });
  }

  // Create SOLD vehicles
  for (let i = 0; i < sold; i++) {
    vehiclesToCreate.push({
      ...vehiclesData[available + i],
      status: "SOLD",
      isVerified: true, // Sold items are always verified
      sellerId: faker.helpers.arrayElement(users).id,
    });
  }

  // Create vehicles in batches
  const batchSize = 10;
  const createdVehicles = [];

  for (let i = 0; i < vehiclesToCreate.length; i += batchSize) {
    const batch = vehiclesToCreate.slice(i, i + batchSize);
    const batchPromises = batch.map((vehicle) =>
      prisma.vehicle.create({
        data: vehicle,
        select: {
          id: true,
          title: true,
          brand: true,
          model: true,
          price: true,
          status: true,
        },
      }),
    );

    const batchResults = await Promise.all(batchPromises);
    createdVehicles.push(...batchResults);

    // Add a small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`✅ Successfully created ${createdVehicles.length} vehicles`);
  return createdVehicles;
};

const main = async () => {
  try {
    await createVehicles({ available: 15, sold: 5 });
  } catch (error) {
    console.error("❌ Error seeding vehicles:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main();
}

export { createVehicles };
