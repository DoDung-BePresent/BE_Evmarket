/**
 * Node modules
 */
import dotenv from "dotenv";

/**
 * Types
 */
import type ms from "ms";

dotenv.config({
  path: process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env",
});

const config = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_URL: process.env.CLIENT_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  WHITELIST_ORIGINS: (process.env.CORS_ALLOWED_ORIGINS || "")
    .split(",")
    .filter(Boolean),

  // LOGS
  LOG_TO_FILE: process.env.LOG_TO_FILE || "true",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",

  // TOKENS
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY as ms.StringValue,
  REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY as ms.StringValue,

  // SUPABASE
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_URL: process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY!,

  // OAUTH
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
  OAUTH_CALLBACK_URL: process.env.OAUTH_CALLBACK_URL!,
};

export default config;
