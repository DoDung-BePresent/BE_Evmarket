/**
 * Node modules
 */
import { faker } from "@faker-js/faker";

/**
 * Libs
 */
import prisma from "../../src/libs/prisma";

const batteryBrands = [
  "Tesla",
  "LG Chem",
  "CATL",
  "BYD",
  "Panasonic",
  "Samsung SDI",
  "SK Innovation",
  "A123 Systems",
  "Lithium Werks",
  "EVE Energy",
  "Gotion High-tech",
  "Farasis Energy",
];

const batteryImages = [
  "https://i.ebayimg.com/images/g/LRYAAOSwdWNke4Tb/s-l1600.webp",
  "https://i.ebayimg.com/images/g/jpYAAOSwci9lzry1/s-l1600.webp",
  "https://i.ebayimg.com/images/g/R8cAAeSw4zBox89t/s-l1600.webp",
  "https://i.ebayimg.com/images/g/ANoAAeSwEcVox8-5/s-l1600.webp",
  "https://i.ebayimg.com/images/g/O2YAAeSwYdJox9AH/s-l1600.webp",
  "http://i.ebayimg.com/images/g/FK4AAOSwie5ntvct/s-l1600.webp",
  "https://i.ebayimg.com/images/g/qSAAAeSw-jFoeCjB/s-l1600.webp",
  "https://i.ebayimg.com/images/g/z3MAAeSwqgdooIXd/s-l1600.webp",
  "https://i.ebayimg.com/images/g/19sAAeSwsDVooIXg/s-l1600.webp",
  "https://i.ebayimg.com/images/g/v~IAAeSwQDponF99/s-l1600.webp",
  "https://i.ebayimg.com/images/g/z3MAAeSwqgdooIXd/s-l1600.webp",
  "https://i.ebayimg.com/images/g/e0EAAeSwHHFooIXf/s-l1600.webp",
  "https://i.ebayimg.com/images/g/UMUAAeSwEcJooxPJ/s-l1600.webp",
  "https://i.ebayimg.com/images/g/3mUAAeSwgpJooxPM/s-l1600.webp",
];

const generateBatteryImages = (): string[] => {
  const imageCount = faker.number.int({ min: 2, max: 5 });
  return faker.helpers.shuffle(batteryImages).slice(0, imageCount);
};

interface BatterySeedConfig {
  available?: number;
  sold?: number;
  delisted?: number;
}

const createBatteries = async (config: BatterySeedConfig = {}) => {
  const { available = 15, sold = 0, delisted = 0 } = config;
  const totalCount = available + sold + delisted;

  console.log(`🔋 Seeding ${totalCount} batteries...`);
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

  const batteries = [];

  // Helper function to create a battery with specific status
  const createBatteryData = (
    index: number,
    status: "AVAILABLE" | "SOLD" | "DELISTED",
  ) => {
    const brand = faker.helpers.arrayElement(batteryBrands);
    const capacity = faker.number.float({ min: 40, max: 120, multipleOf: 5 });
    const health = faker.number.float({ min: 70, max: 100, multipleOf: 1 });
    const year = faker.number.int({ min: 2010, max: 2024 }); // <-- Thêm dòng này
    const randomSeller = faker.helpers.arrayElement(users);

    return {
      title: `${brand} ${capacity}kWh EV Battery Pack`,
      description: faker.lorem.paragraphs(2, "\n\n"),
      price: faker.number.float({ min: 8000, max: 50000, multipleOf: 500 }),
      images: generateBatteryImages(),
      status,
      brand,
      capacity,
      year, // <-- Thêm dòng này
      health: faker.datatype.boolean(0.8) ? health : null,
      isVerified: faker.datatype.boolean(0.6),
      sellerId: randomSeller.id,
    };
  };

  let index = 1;

  // Create AVAILABLE batteries
  for (let i = 0; i < available; i++) {
    batteries.push(createBatteryData(index++, "AVAILABLE"));
  }

  // Create SOLD batteries
  for (let i = 0; i < sold; i++) {
    batteries.push(createBatteryData(index++, "SOLD"));
  }

  // Create DELISTED batteries
  for (let i = 0; i < delisted; i++) {
    batteries.push(createBatteryData(index++, "DELISTED"));
  }

  // Create batteries in batches
  const batchSize = 8;
  const createdBatteries = [];

  for (let i = 0; i < batteries.length; i += batchSize) {
    const batch = batteries.slice(i, i + batchSize);
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
    await createBatteries({ available: 25, sold: 15, delisted: 5 });
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
