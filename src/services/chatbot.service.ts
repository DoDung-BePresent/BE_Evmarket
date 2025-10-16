/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Node modules
 */
import { Prisma } from "@prisma/client";
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Libs
 */
import prisma from "@/libs/prisma";

const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export const chatbotService = {
  answerQuestion: async (question: string) => {
    const searchParams = await extractSearchParameters(question);

    const searchResults = await searchListings(searchParams);

    if (searchResults.length === 0) {
      return "Rất tiếc, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn. Bạn có thể thử lại với các tiêu chí khác không?";
    }

    const context = searchResults
      .map(
        (item) =>
          `- Loại: ${item.type}, Tên: ${item.title}, Giá: ${item.price.toLocaleString()} VND, Mô tả: ${item.description.substring(0, 100)}... Link: ${config.CLIENT_URL}/${item.type.toLowerCase()}/${item.id}`,
      )
      .join("\n");

    const finalPrompt = `
      Bạn là một trợ lý ảo thân thiện của website mua bán xe và pin điện EVmarket.
      Dựa vào thông tin sản phẩm có sẵn dưới đây và câu hỏi của người dùng, hãy đưa ra một câu trả lời tự nhiên, hữu ích và mời họ xem chi tiết sản phẩm.
      Quan trọng: Phát hiện ngôn ngữ trong "Câu hỏi của người dùng" và trả lời bằng chính ngôn ngữ đó.
      Không được bịa thêm thông tin không có trong danh sách.

      ---
      Thông tin sản phẩm có sẵn:
      ${context}
      ---

      Câu hỏi của người dùng: "${question}"

      Câu trả lời của bạn:
    `;

    const result = await model.generateContent(finalPrompt);
    return result.response.text();
  },
};

async function extractSearchParameters(question: string): Promise<any> {
  const prompt = `
    Phân tích câu hỏi của người dùng và trích xuất các tiêu chí tìm kiếm xe hoặc pin điện dưới dạng JSON.
    Các tiêu chí có thể bao gồm:
    - listingType: "VEHICLE" hoặc "BATTERY". Nếu không rõ, để null.
    - price: { "min": number, "max": number }.
    - range: { "min": number, "max": number } (đối với xe, đơn vị km).
    - capacity: { "min": number, "max": number } (đối với pin, đơn vị kWh).
    - brand: string.

    Ví dụ: "xe điện dưới 500 triệu" -> { "listingType": "VEHICLE", "price": { "max": 500000000 } }
    Ví dụ: "pin oto điện tầm 70kwh" -> { "listingType": "BATTERY", "capacity": { "min": 70 } }

    Chỉ trả về JSON, không giải thích gì thêm.

    Câu hỏi của người dùng: "${question}"
  `;

  const result = await model.generateContent(prompt);
  const jsonString = result.response
    .text()
    .replace(/```json|```/g, "")
    .trim();
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON from Gemini:", error);
    return {};
  }
}

async function searchListings(params: any) {
  const where: Prisma.VehicleWhereInput & Prisma.BatteryWhereInput = {
    status: "AVAILABLE",
  };

  if (params.price) {
    where.price = {};
    if (params.price.min) where.price.gte = params.price.min;
    if (params.price.max) where.price.lte = params.price.max;
  }
  if (params.brand) {
    where.brand = { contains: params.brand, mode: "insensitive" };
  }

  const results: any[] = [];

  if (params.listingType === "VEHICLE" || !params.listingType) {
    const vehicleWhere = { ...where };
    if (params.range) {
      // Giả sử 'range' được lưu trong specifications.batteryAndCharging.range
      //TODO: Đây là một query phức tạp, tạm thời đơn giản hóa
    }
    const vehicles = await prisma.vehicle.findMany({
      where: vehicleWhere,
      take: 5, // Lấy tối đa 5 kết quả
      select: { id: true, title: true, price: true, description: true },
    });
    results.push(...vehicles.map((v) => ({ ...v, type: "Vehicle" })));
  }

  if (params.listingType === "BATTERY" || !params.listingType) {
    const batteryWhere = { ...where };
    if (params.capacity)
      batteryWhere.capacity = {
        gte: params.capacity.min,
        lte: params.capacity.max,
      };
    const batteries = await prisma.battery.findMany({
      where: batteryWhere,
      take: 5,
      select: { id: true, title: true, price: true, description: true },
    });
    results.push(...batteries.map((b) => ({ ...b, type: "Battery" })));
  }

  return results;
}
