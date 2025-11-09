import { Router } from "express";
import { chatbotController } from "@/controllers/chatbot.controller";
// import { authenticate } from "@/middlewares/auth.middleware";

const chatbotRouter = Router();

// TODO: Có thể yêu cầu đăng nhập hoặc không, tùy vào business của bạn
// chatbotRouter.use(authenticate);

chatbotRouter.post("/", chatbotController.handleChat);

export default chatbotRouter;
