/**
 * Node modules
 */
import { Router } from "express";

/**
 * Controllers
 */
import { paymentController } from "@/controllers/payment.controller";

const paymentRouter = Router();

// Endpoint này MoMo sẽ gọi đến để thông báo kết quả giao dịch
paymentRouter.post("/momo/ipn", paymentController.handleMomoIpn);

export default paymentRouter;
