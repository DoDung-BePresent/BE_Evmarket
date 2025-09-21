/**
 * Node modules
 */
import { faker } from "@faker-js/faker";

/**
 * Libs
 */
import prisma from "../../src/libs/prisma";

const vehicleBrands = [
  "Tesla",
  "BYD",
  "Nissan",
  "BMW",
  "Audi",
  "Mercedes-Benz",
  "Volkswagen",
  "Hyundai",
  "Kia",
  "Ford",
  "Chevrolet",
  "Lucid",
  "Rivian",
  "Polestar",
];

const generateVehicleImages = (vehicleIndex: number): string[] => {
  const imageCount = faker.number.int({ min: 3, max: 5 });
  const images = [];

  for (let i = 1; i <= imageCount; i++) {
    images.push(
      `https://placehold.co/600x400?text=vehicle_${vehicleIndex}_${i}`,
    );
  }

  return images;
};

const createVehicles = async (count: number = 20) => {
  console.log(`🚗 Seeding ${count} vehicles...`);

  // Get all existing users to assign as sellers
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    throw new Error("No users found. Please seed users first.");
  }

  const vehicles = [];

  for (let i = 0; i < count; i++) {
    const brand = faker.helpers.arrayElement(vehicleBrands);
    const model = faker.vehicle.model();
    const year = faker.number.int({ min: 2015, max: 2024 });
    const mileage = faker.number.int({ min: 0, max: 200000 });
    const randomSeller = faker.helpers.arrayElement(users);

    const vehicle = {
      title: `${year} ${brand} ${model}`,
      description: faker.lorem.paragraphs(2, "\n\n"),
      price: faker.number.float({ min: 15000, max: 150000, multipleOf: 500 }),
      images: generateVehicleImages(i + 1),
      status: faker.helpers.arrayElement([
        "AVAILABLE",
        "SOLD",
        "DELISTED",
      ]) as any,
      brand,
      model,
      year,
      mileage,
      isVerified: faker.datatype.boolean(0.7), // 70% chance of being verified
      sellerId: randomSeller.id,
    };

    vehicles.push(vehicle);
  }

  // Create vehicles in batches
  const batchSize = 10;
  const createdVehicles = [];

  for (let i = 0; i < vehicles.length; i += batchSize) {
    const batch = vehicles.slice(i, i + batchSize);
    const batchPromises = batch.map((vehicle) =>
      prisma.vehicle.create({
        data: vehicle,
        select: {
          id: true,
          title: true,
          brand: true,
          model: true,
          price: true,
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
    await createVehicles(25);
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
