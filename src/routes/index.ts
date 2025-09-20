/**
 * Node modules
 */
import { Router } from "express";

/**
 * Routes
 */
import userRoutes from "@/routes/user.route";
import authRouter from "@/routes/auth.route";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/users", userRoutes);

export default router;
