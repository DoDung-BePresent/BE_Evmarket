/**
 * Constants
 */
import { STATUS_CODE } from "@/constants/error.constant";

/**
 * Middlewares
 */
import { asyncHandler } from "@/middlewares/error.middleware";

/**
 * Services
 */
import { chatbotService } from "@/services/chatbot.service";

export const chatbotController = {
  handleChat: asyncHandler(async (req, res) => {
    const { question } = req.body;
    if (!question) {
      return res.status(STATUS_CODE.BAD_REQUEST).json({ message: "Question is required." });
    }

    const answer = await chatbotService.answerQuestion(question);

    res.status(STATUS_CODE.OK).json({ answer });
  }),
};