import { Worker } from "bullmq";
import config from "@/configs/env.config";
import { parse } from "redis-url-parser";
import logger from "@/libs/logger";
import { emailService } from "@/services/email.service";
import { contractService } from "@/services/contract.service";

const redisConnectionOptions = parse(config.REDIS_URL);

const connection = {
  host: redisConnectionOptions.host,
  port: redisConnectionOptions.port,
  password: redisConnectionOptions.password,
};

logger.info("🚀 Worker process started, waiting for jobs...");

// --- Worker xử lý Email ---
new Worker(
  "email-queue",
  async (job) => {
    const {
      to,
      name,
      reason,
      listingTitle,
      isVerified,
      transactionId,
      pdfBuffer,
      resetUrl,
    } = job.data;
    logger.info(`Processing email job: ${job.name} for ${to}`);
    try {
      switch (job.name) {
        case "sendAccountLockedEmail":
          await emailService.sendAccountLockedEmail(to, name, reason);
          break;
        case "sendListingVerifiedEmail":
          await emailService.sendListingVerifiedEmail(
            to,
            name,
            listingTitle,
            isVerified,
          );
          break;
        case "sendContractEmail":
          // Dữ liệu buffer khi qua JSON sẽ thành object, cần chuyển đổi lại
          await emailService.sendContractEmail(
            to,
            name,
            transactionId,
            Buffer.from(pdfBuffer.data),
          );
          break;
        case "sendPasswordResetEmail":
          await emailService.sendPasswordResetEmail(to, name, resetUrl);
          break;
        default:
          throw new Error(`Unknown email job name: ${job.name}`);
      }
    } catch (error) {
      logger.error(`Email job ${job.id} (${job.name}) failed for ${to}`, error);
      throw error; // Ném lỗi để BullMQ có thể thử lại job
    }
  },
  { connection },
);

// --- Worker xử lý Hợp đồng ---
new Worker(
  "contract-queue",
  async (job) => {
    const { transaction } = job.data;
    logger.info(`Processing contract job for transaction: ${transaction.id}`);
    try {
      // Hàm này sẽ tự tạo PDF, lưu vào DB và thêm job gửi mail vào emailQueue
      await contractService.generateAndSaveContract(transaction);
    } catch (error) {
      logger.error(
        `Contract job ${job.id} for transaction ${transaction.id} failed`,
        error,
      );
      throw error;
    }
  },
  { connection },
);
