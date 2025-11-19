import logger from "@/libs/logger";

export const systemService = {
  runScheduledTasks: async () => {
    logger.info("Running scheduled tasks triggered by GitHub Actions...");

    // Trong tương lai, bạn có thể thêm các tác vụ cần chạy định kỳ ở đây.
    // Ví dụ:
    // - Tìm và gửi lại các email bị lỗi.
    // - Dọn dẹp các file tạm.
    // - Tạo báo cáo hàng ngày.

    logger.info("Scheduled tasks finished.");
    return { status: "ok", timestamp: new Date() };
  },
};