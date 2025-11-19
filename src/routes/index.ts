/**
 * Node modules
 */
import { Router } from "express";

/**
 * Routes
 */
import adminRouter from "@/routes/admin.route";
import userRouter from "@/routes/user.route";
import authRouter from "@/routes/auth.route";
import walletRouter from "@/routes/wallet.route";
import vehicleRouter from "@/routes/vehicle.route";
import batteryRouter from "@/routes/battery.route";
import paymentRouter from "@/routes/payment.route";
import auctionRouter from "@/routes/auction.route";
import checkoutRouter from "@/routes/checkout.route";
import transactionRouter from "@/routes/transaction.route";
import chatbotRouter from "@/routes/chatbot.route";
import contractRouter from "@/routes/contract.route";
import appointmentRouter from "@/routes/appointment.route";
import cartRouter from "@/routes/cart.route";
import systemRouter from "@/routes/system.route";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

router.use("/admin", adminRouter);
router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/vehicles", vehicleRouter);
router.use("/batteries", batteryRouter);
router.use("/wallet", walletRouter);
router.use("/payments", paymentRouter);
router.use("/auctions", auctionRouter);
router.use("/checkout", checkoutRouter);
router.use("/transactions", transactionRouter);
router.use("/chatbot", chatbotRouter);
router.use("/contracts", contractRouter);
router.use("/appointments", appointmentRouter);
router.use("/system", systemRouter);
router.use("/cart", cartRouter);

export default router;
