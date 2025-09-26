import prisma from "../../src/libs/prisma";

const SAMPLE_VIDEO_URL =
  "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const createReviews = async () => {
  const completedTransactions = await prisma.transaction.findMany({
    where: { status: "COMPLETED" },
    select: { id: true, buyerId: true },
  });

  const reviews = [];

  for (let i = 0; i < completedTransactions.length; i++) {
    const transaction = completedTransactions[i];
    const review = await prisma.review.create({
      data: {
        rating: Math.floor(Math.random() * 5) + 1,
        comment: `Review for transaction ${transaction.id}`,
        mediaUrls: [
          `https://placehold.co/600x400?text=review_${i + 1}`,
          SAMPLE_VIDEO_URL,
        ],
        transactionId: transaction.id,
        reviewerId: transaction.buyerId,
      },
    });
    reviews.push(review);
  }

  console.log(`✅ Seeded ${reviews.length} reviews`);
  return reviews;
};

const main = async () => {
  try {
    await createReviews();
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

export { createReviews };
