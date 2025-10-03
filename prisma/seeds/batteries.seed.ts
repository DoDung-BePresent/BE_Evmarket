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
  return faker.helpers.arrayElements(batteryImages, imageCount);
};

const createBatteries = async (count: number = 15) => {
  console.log(`🔋 Seeding ${count} batteries...`);

  // Get all existing users to assign as sellers
  const users = await prisma.user.findMany({
    select: { id: true },
  });

  if (users.length === 0) {
    throw new Error("No users found. Please seed users first.");
  }

  const batteries = [];

  for (let i = 0; i < count; i++) {
    const brand = faker.helpers.arrayElement(batteryBrands);
    const year = faker.number.int({ min: 2015, max: 2024 });
    const capacity = faker.number.float({ min: 40, max: 120, multipleOf: 5 });
    const health = faker.number.float({ min: 70, max: 100, multipleOf: 1 });
    const randomSeller = faker.helpers.arrayElement(users);

    const battery = {
      title: `${brand} ${capacity}kWh EV Battery Pack`,
      description: faker.lorem.paragraphs(2, "\n\n"),
      price: faker.number.float({ min: 8000, max: 50000, multipleOf: 500 }),
      images: generateBatteryImages(),
      status: faker.helpers.arrayElement([
        "AVAILABLE",
        "SOLD",
        "DELISTED",
      ]) as any,
      brand,
      capacity,
      year,
      health: faker.datatype.boolean(0.8) ? health : null, // 80% chance of having health data
      specifications: {
        weight: `${faker.number.int({ min: 400, max: 700 })}kg`,
        voltage: `${faker.number.int({ min: 300, max: 450 })}V`,
        warrantyPeriod: `${faker.number.int({ min: 1, max: 5 })} years remaining`,
        chargingTime: `${faker.number.int({ min: 30, max: 90 })} minutes (0-80%)`,
        chemistry: faker.helpers.arrayElement(["NCA", "NMC", "LFP"]),
        temperatureRange: "-20°C to 60°C",
        degradation: `${100 - health}% (${health}% capacity)`,
        installation: "Professional required",
      },
      isVerified: faker.datatype.boolean(0.6), // 60% chance of being verified
      sellerId: randomSeller.id,
    };

    batteries.push(battery);
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
    await createBatteries(20);
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
