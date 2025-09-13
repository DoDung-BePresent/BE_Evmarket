/**
 * Node modules
 */
import dotenv from "dotenv";

/**
 * Types
 */
import type ms from "ms";

dotenv.config();

const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV,
  API_URL: process.env.API_URL,
  CLIENT_URL: process.env.CLIENT_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  WHITELIST_ORIGINS: ["http://localhost:5173"],

  // LOGS
  LOG_QUERIES: process.env.LOG_QUERIES || "false",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // TOKENS
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY as ms.StringValue,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY as ms.StringValue,
};

export default config;
