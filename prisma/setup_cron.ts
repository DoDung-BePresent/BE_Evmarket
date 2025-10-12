import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupCronJobs() {
  console.log("🚀 Setting up cron jobs...");

  try {
    // Bật extension pg_cron
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_cron;");
    console.log("✅ pg_cron extension enabled.");

    // Các thông số cho cron job
    const jobName = "cancel-overdue-txns";
    const schedule = "*/5 * * * *"; // Mỗi 5 phút
    const command = "SELECT cancel_overdue_transactions();";

    // Gọi function `schedule_cron_job` để thực hiện việc lên lịch
    // Đây là cách an toàn để vượt qua các giới hạn về quyền
    await prisma.$executeRaw`
      SELECT schedule_cron_job(${jobName}, ${schedule}, ${command});
    `;

    console.log(`✅ Cron job '${jobName}' setup completed successfully.`);
  } catch (error) {
    console.error("❌ Failed to set up cron jobs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupCronJobs();