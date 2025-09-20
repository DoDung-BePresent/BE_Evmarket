/**
 * Node modules
 */
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cookieParser from "cookie-parser";

/**
 * Custom modules
 */
import logger from "@/libs/logger";
import config from "@/configs/env.config";
import { setupSwagger } from "@/libs/swagger";
import limiter from "@/libs/express-rate-limit";
import { errorHandler, notFoundHandler } from "@/middlewares/error.middleware";

/**
 * Router
 */
import v1Routes from "@/routes";

/**
 * Types
 */
import type { CorsOptions } from "cors";

/**
 * Express app initial
 */
const app = express();

/**
 * Configure CORS options
 */
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (
      config.NODE_ENV === "development" ||
      !origin ||
      config.WHITELIST_ORIGINS.includes(origin)
    ) {
      callback(null, true);
    } else {
      callback(
        new Error(`CORS error: ${origin} is not allowed by CORS`),
        false,
      );
      logger.warn(`CORS error: ${origin} is not allowed by CORS`);
    }
  },
  credentials: true,
};

// Apply middlewares
app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  compression({
    threshold: 1024, // Only compress response larger than 1KB
  }),
);
app.use(limiter);

// Setup Swagger
setupSwagger(app);

app.use("/api/v1", v1Routes);

app.get("/", (req: Request, res: Response) => {
  res.json({
    msg: "Hello everyone",
  });
});

// Error handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
