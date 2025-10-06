/**
 * Node modules
 */
import axios from "axios";
import crypto from "crypto";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Libs
 */
import { InternalServerError } from "@/libs/error";

interface CreatePaymentParams {
  orderId: string;
  amount: number;
  orderInfo: string;
  redirectUrl: string;
  ipnUrl: string;
}

export const momoService = {
  createPayment: async ({
    orderId,
    amount,
    orderInfo,
    redirectUrl,
    ipnUrl,
  }: CreatePaymentParams) => {
    const requestId = orderId;
    const requestType = "captureWallet";

    const rawSignature = `accessKey=${config.MOMO_ACCESS_KEY}&amount=${amount}&extraData=&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${config.MOMO_PARTNER_CODE}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", config.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode: config.MOMO_PARTNER_CODE,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType,
      extraData: "",
      lang: "en",
      signature,
    };

    try {
      const response = await axios.post(config.MOMO_API_ENDPOINT, requestBody);
      if (response.data.resultCode !== 0) {
        throw new InternalServerError(`MoMo Error: ${response.data.message}`);
      }
      return response.data;
    } catch (error: any) {
      throw new InternalServerError(
        error.response?.data?.message || "Failed to create MoMo payment",
      );
    }
  },

  verifyIpnSignature: (body: any): boolean => {
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = body;

    const rawSignature = `accessKey=${config.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const expectedSignature = crypto
      .createHmac("sha256", config.MOMO_SECRET_KEY)
      .update(rawSignature)
      .digest("hex");

    return signature === expectedSignature;
  },
};
