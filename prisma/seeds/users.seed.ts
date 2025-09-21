/**
 * Node modules
 */
import { faker } from "@faker-js/faker";

/**
 * Libs
 */
import prisma from "../../src/libs/prisma";
import { hashPassword } from "../../src/libs/crypto";

const createSellers = async (count: number = 10) => {
  console.log(`🌱 Seeding ${count} sellers...`);

  const sellers = [];

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const hashedPassword = await hashPassword("password123");

    const seller = {
      email,
      name: `${firstName} ${lastName}`,
      avatar: faker.image.avatar(),
      isVerified: faker.datatype.boolean(0.8), // 80% chance of being verified
      accounts: {
        create: {
          type: "CREDENTIALS" as const,
          provider: "CREDENTIALS" as const,
          providerAccountId: email,
          password: hashedPassword,
        },
      },
    };

    sellers.push(seller);
  }

  // Create sellers in batches to avoid overwhelming the database
  const batchSize = 5;
  const createdSellers = [];

  for (let i = 0; i < sellers.length; i += batchSize) {
    const batch = sellers.slice(i, i + batchSize);
    const batchPromises = batch.map((seller) =>
      prisma.user.create({
        data: seller,
        select: {
          id: true,
          email: true,
          name: true,
        },
      }),
    );

    const batchResults = await Promise.all(batchPromises);
    createdSellers.push(...batchResults);

    // Add a small delay between batches
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`✅ Successfully created ${createdSellers.length} sellers`);
  return createdSellers;
};

const main = async () => {
  try {
    await createSellers(15);
  } catch (error) {
    console.error("❌ Error seeding sellers:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

if (require.main === module) {
  main();
}

export { createSellers };
