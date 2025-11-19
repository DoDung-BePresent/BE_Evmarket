import { Queue } from "bullmq";
import config from "@/configs/env.config";
import { parse } from "redis-url-parser";

const redisConnection = parse(config.REDIS_URL);

const connection = {
  host: redisConnection.host,
  port: redisConnection.port,
  password: redisConnection.password,
};

// Hàng đợi cho việc gửi email
export const emailQueue = new Queue("email-queue", { connection });

// Hàng đợi cho việc tạo hợp đồng
export const contractQueue = new Queue("contract-queue", { connection });
