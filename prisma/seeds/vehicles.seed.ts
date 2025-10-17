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
  "https://www.nicepng.com/png/full/77-778891_model-s-tesla-model-3-png.png", // Tesla Model 3
  "https://w7.pngwing.com/pngs/705/817/png-transparent-white-tesla-model-y-transport-cars-tesla.png", // Tesla Model Y
  "https://media.licdn.com/dms/image/v2/D5622AQEgP55Qx26WJg/feedshare-shrink_800/feedshare-shrink_800/0/1712310604083?e=2147483647&v=beta&t=g49Radvb_ojPuhpE7eJzdB1YsW5d5049X7NlozAgfXM", // BYD Atto 3
  "https://www.pngplay.com/wp-content/uploads/13/Nissan-Leaf-PNG-Free-File-Download.png", // Nissan Leaf
  "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/BMW_Concept_i4.png/1200px-BMW_Concept_i4.png", // BMW i4
  "https://get-moba.com/app/uploads/2024/05/audi-e-tron-gt-666x375-1.png", // Audi e-tron GT
  "https://media.oneweb.mercedes-benz.com/images/dynamic/asia/VN/297123/802_052/iris.png?q=COSY-EU-100-1713d0VXq0YFqtyO67PobzIr3eWsrrCsdRRzwQZhkHZbMw3SGtGyMtsd2vtcUfp8cXGEuiRJ0l34AOB2NQnbApj7bI5ux52QC31vTkzNBTnm7jA6IhKV5Kh%25vqCBlyLRznyYax7oxrH1KMun8wvVwoiZUbXM4FG4fTg906O6PDBSqSeWAhItsd5kdcUfKM6XGEvTRJ0lL6qOB2abRbApHYpI5usoJQC3UC1kzNGtNm7j0O3hKVB%25t%25vqA8TyLRiO6Yax4JOroYhfldsbbAp7oMIkb1ECQmIFUOkzNUTum7jscWhKVzsM%25vq7UcyLRKOyYaxvODrH1peen8wiA2oiZ45gM4zuA1YtEWpTuP6CPoZFIT9ZxexrlrKE847dvE5jCDtyAib&BKGND=9&IMGT=P27&cp=U7lLKRUtPa6KAFr8s_ubHw&uni=m&POV=BE040,PZM", // Mercedes-Benz EQS
  "https://hyundaithainguyenjsc.vn/wp-content/uploads/2023/08/KyOubHOmxibDQusk8_34-1.png", // Hyundai Ioniq 5
  "https://www.halliwelljones.co.uk/uploads/page-images/kia-ev6-gt_2022-gt-white-pearl_0000.png", // Kia EV6
  "https://cdn.prod.website-files.com/60ce1b7dd21cd517bb39ff20/61a7aef2dfdf5e75ef5bb4bf_mustang-mache.png", // Ford Mustang Mach-E
  "https://www.electrifying.com/files/Nb3H3VsqrldjLWDq/rivian-rt1-evchargeplus-00.png", // Rivian R1T
  "https://file.kelleybluebookimages.com/kbb/base/evox/CP/53890/2024-Polestar-2-front_53890_032_2400x1800_729.png", // Polestar 2
];

const generateVehicleImages = (): string[] => {
  const imageCount = faker.number.int({ min: 3, max: 5 });
  return faker.helpers.shuffle(vehicleImages).slice(0, imageCount);
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
      images: generateVehicleImages(),
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
