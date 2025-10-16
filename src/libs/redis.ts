/**
 * Node modules
 */
import { createClient } from "redis";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Libs
 */
import logger from "@/libs/logger";

const redisClient = createClient({
  url: config.REDIS_URL,
});

redisClient.on("connect", () => {
  logger.info("✅ Redis client connected");
});

redisClient.on("error", (err) => {
  logger.error("❌ Redis client error", err);
});

redisClient.connect();

export default redisClient;
