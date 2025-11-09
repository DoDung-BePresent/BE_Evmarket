import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setupCronJobs() {
  console.log("🚀 Setting up cron jobs...");

  try {
    // Bật extension pg_cron
    await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_cron;");
    console.log("✅ pg_cron extension enabled.");

    // XÓA TẤT CẢ CRON JOBS CŨ ĐỂ TRÁNH TRÙNG LẶP
    console.log("🧹 Clearing old cron jobs...");
    await prisma.$executeRawUnsafe("SELECT cron.unschedule(jobid) FROM cron.job;");
    console.log("✅ Old cron jobs cleared.");

    // Job 1: Hủy giao dịch mua hàng thông thường quá hạn
    const cancelTxJobName = "cancel-overdue-txns";
    const cancelTxSchedule = "*/5 * * * *"; // Mỗi 5 phút
    const cancelTxCommand = "SELECT cancel_overdue_transactions();";

    await prisma.$executeRaw`
      SELECT schedule_cron_job(${cancelTxJobName}, ${cancelTxSchedule}, ${cancelTxCommand});
    `;
    console.log(
      `✅ Cron job '${cancelTxJobName}' setup completed successfully.`,
    );

    // Job 2: Xử lý các phiên đấu giá đã kết thúc
    const processAuctionsJobName = "process-ended-auctions";
    const processAuctionsSchedule = "*/1 * * * *"; // Mỗi 1 phút để test (production có thể là 5 phút)
    const processAuctionsCommand = "SELECT process_ended_auctions();";

    await prisma.$executeRaw`
      SELECT schedule_cron_job(${processAuctionsJobName}, ${processAuctionsSchedule}, ${processAuctionsCommand});
    `;
    console.log(
      `✅ Cron job '${processAuctionsJobName}' setup completed successfully.`,
    );

    // Job 3: Xử lý các thanh toán đấu giá quá hạn (đã được thay thế bằng Job 5)
    // const overduePaymentsJobName = "process-overdue-auction-payments";
    // const overduePaymentsSchedule = "*/15 * * * *"; // Mỗi 15 phút
    // const overduePaymentsCommand = "SELECT process_overdue_auction_payments();";
    // await prisma.$executeRaw`
    //   SELECT schedule_cron_job(${overduePaymentsJobName}, ${overduePaymentsSchedule}, ${overduePaymentsCommand});
    // `;
    // console.log(
    //   `✅ Cron job '${overduePaymentsJobName}' setup completed successfully.`,
    // );

    // Job 4: Tự động hoàn tất các giao dịch đã giao hàng
    const autoCompleteJobName = "auto-complete-shipped-transactions";
    const autoCompleteSchedule = "*/30 * * * *";
    const autoCompleteCommand = "SELECT auto_complete_shipped_transactions();";

    await prisma.$executeRaw`
      SELECT schedule_cron_job(${autoCompleteJobName}, ${autoCompleteSchedule}, ${autoCompleteCommand});
    `;
    console.log(
      `✅ Cron job '${autoCompleteJobName}' setup completed successfully.`,
    );

    // Job 5: Xử lý các giao dịch đấu giá quá hạn thanh toán
    const expiredAuctionJobName = "handle-expired-auction-payments";
    const expiredAuctionSchedule = "0 * * * *"; // Chạy mỗi giờ
    const expiredAuctionCommand = "SELECT handle_expired_auction_payments();";

    await prisma.$executeRaw`
      SELECT schedule_cron_job(${expiredAuctionJobName}, ${expiredAuctionSchedule}, ${expiredAuctionCommand});
    `;
    console.log(
      `✅ Cron job '${expiredAuctionJobName}' setup completed successfully.`,
    );
  } catch (error) {
    console.error("❌ Failed to set up cron jobs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupCronJobs();
