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

const vehicleImages = [
  "https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/2019_Tesla_Model_3_Performance_AWD_Front.jpg/1200px-2019_Tesla_Model_3_Performance_AWD_Front.jpg", // Tesla Model 3
  "https://upload.wikimedia.org/wikipedia/commons/5/5c/Tesla_Model_Y_1X7A6211.jpg", // Tesla Model Y
  "https://i1-vnexpress.vnecdn.net/2024/06/17/BYD-Atto-3-VNEXPRESS-27-JPG.jpg?w=2400&h=0&q=100&dpr=1&fit=crop&s=2BUkZZ_acW3duKCkNWNw8w&t=image", // BYD Atto 3
  "https://upload.wikimedia.org/wikipedia/commons/d/de/Nissan_Leaf_2018_%2831874639158%29_%28cropped%29.jpg", // Nissan Leaf
  "https://i1-vnexpress.vnecdn.net/2023/08/01/IMG-4443-JPG.jpg?w=2400&h=0&q=100&dpr=1&fit=crop&s=fYftX0XbAenDxjv3jPXEJg&t=image", // BMW i4
  "https://upload.wikimedia.org/wikipedia/commons/d/d5/Audi_e-tron_GT_IMG_5689.jpg", // Audi e-tron GT
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Mercedes-Benz_V297_Classic-Days_2022_DSC_0016.jpg/1200px-Mercedes-Benz_V297_Classic-Days_2022_DSC_0016.jpg", // Mercedes-Benz EQS
  "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Hyundai_Ioniq_5_AWD_Techniq-Paket_%E2%80%93_f_31122024.jpg/1200px-Hyundai_Ioniq_5_AWD_Techniq-Paket_%E2%80%93_f_31122024.jpg", // Hyundai Ioniq 5
  "https://upload.wikimedia.org/wikipedia/commons/d/d9/2021_Kia_EV6_GT-Line_S.jpg", // Kia EV6
  "https://upload.wikimedia.org/wikipedia/commons/4/49/2021_Ford_Mustang_Mach-E_Standard_Range_Front.jpg", // Ford Mustang Mach-E
  "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/2022_Rivian_R1T_%28in_Glacier_White%29%2C_front_6.21.22.jpg/1200px-2022_Rivian_R1T_%28in_Glacier_White%29%2C_front_6.21.22.jpg", // Rivian R1T
  "https://hips.hearstapps.com/hmg-prod/images/2025-polestar-2-2-672d4eec1edeb.jpg?crop=0.732xw:0.617xh;0.130xw,0.302xh&resize=980:*", // Polestar 2
];

const generateVehicleImages = (): string[] => {
  const imageCount = faker.number.int({ min: 3, max: 5 });
  return faker.helpers.arrayElements(vehicleImages, imageCount);
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
      images: generateVehicleImages(),
      status: faker.helpers.arrayElement([
        "AVAILABLE",
        "SOLD",
        "DELISTED",
      ]) as any,
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
