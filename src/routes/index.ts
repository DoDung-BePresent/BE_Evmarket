/**
 * Node modules
 */
import { Router } from "express";

/**
 * Routes
 */
import userRouter from "@/routes/user.route";
import authRouter from "@/routes/auth.route";
import vehicleRouter from "@/routes/vehicle.route";
import batteryRouter from "@/routes/battery.route";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/vehicles", vehicleRouter);
router.use("/batteries", batteryRouter);

export default router;
