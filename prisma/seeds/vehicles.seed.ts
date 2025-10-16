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

interface VehicleSeedConfig {
  available?: number;
  sold?: number;
  delisted?: number;
}

const createVehicles = async (config: VehicleSeedConfig = {}) => {
  const { available = 20, sold = 0, delisted = 0 } = config;
  const totalCount = available + sold + delisted;

  console.log(`🚗 Seeding ${totalCount} vehicles...`);
  console.log(`   📊 AVAILABLE: ${available}`);
  console.log(`   📊 SOLD: ${sold}`);
  console.log(`   📊 DELISTED: ${delisted}`);

  // Get all existing users to assign as sellers
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    throw new Error("No users found. Please seed users first.");
  }

  const vehicles = [];

  // Helper function to create a vehicle with specific status
  const createVehicleData = (
    index: number,
    status: "AVAILABLE" | "SOLD" | "DELISTED",
  ) => {
    const brand = faker.helpers.arrayElement(vehicleBrands);
    const model = faker.vehicle.model();
    const year = faker.number.int({ min: 2015, max: 2024 });
    const mileage = faker.number.int({ min: 0, max: 200000 });
    const randomSeller = faker.helpers.arrayElement(users);

    return {
      title: `${year} ${brand} ${model}`,
      description: faker.lorem.paragraphs(2, "\n\n"),
      price: faker.number.float({ min: 15000, max: 150000, multipleOf: 500 }),
      images: generateVehicleImages(index),
      status,
      brand,
      model,
      year,
      mileage,
      specifications: {
        performance: {
          topSpeed: `${faker.number.int({ min: 120, max: 180 })} mph`,
          acceleration: `${faker.number.float({ min: 2.5, max: 8, multipleOf: 0.1 })} seconds (0-60 mph)`,
          motorType: faker.helpers.arrayElement([
            "Single Motor RWD",
            "Dual Motor AWD",
            "Tri-Motor AWD",
          ]),
          horsepower: `${faker.number.int({ min: 250, max: 1000 })} hp`,
        },
        dimensions: {
          length: `${faker.number.float({ min: 170, max: 200, multipleOf: 0.1 })} in`,
          width: `${faker.number.float({ min: 70, max: 80, multipleOf: 0.1 })} in`,
          height: `${faker.number.float({ min: 55, max: 70, multipleOf: 0.1 })} in`,
          curbWeight: `${faker.number.int({ min: 3500, max: 5500 })} lbs`,
        },
        batteryAndCharging: {
          batteryCapacity: `${faker.number.int({ min: 60, max: 120 })} kWh`,
          range: `${faker.number.int({ min: 250, max: 450 })} miles (EPA)`,
          chargingSpeed: `${faker.number.int({ min: 150, max: 350 })} kW`,
          chargeTime: `${faker.number.int({ min: 20, max: 45 })} minutes (10-80%)`,
        },
        warranty: {
          basic: "4 years / 50,000 miles",
          battery: "8 years / 120,000 miles",
          drivetrain: "8 years / 120,000 miles",
        },
      },
      isVerified: faker.datatype.boolean(0.7),
      sellerId: randomSeller.id,
    };
  };

  let index = 1;

  // Create AVAILABLE vehicles
  for (let i = 0; i < available; i++) {
    vehicles.push(createVehicleData(index++, "AVAILABLE"));
  }

  // Create SOLD vehicles
  for (let i = 0; i < sold; i++) {
    vehicles.push(createVehicleData(index++, "SOLD"));
  }

  // Create DELISTED vehicles
  for (let i = 0; i < delisted; i++) {
    vehicles.push(createVehicleData(index++, "DELISTED"));
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
    await createVehicles({ available: 30, sold: 20, delisted: 10 });
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
