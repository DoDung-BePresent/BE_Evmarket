/**
 * Node modules
 */
import ejs from "ejs";
import path from "path";
import puppeteer from "puppeteer";
import { format } from "date-fns";
import { Transaction, User, Vehicle, Battery } from "@prisma/client";

/**
 * Libs
 */
import prisma from "@/libs/prisma";
import logger from "@/libs/logger";
import { supabase } from "@/libs/supabase";
import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
} from "@/libs/error";

/**
 * Constants
 */
import { SUPABASE_BUCKETS } from "@/constants/supabase.constant";

type TransactionWithDetails = Transaction & {
  buyer: User;
  vehicle?: (Vehicle & { seller: User }) | null;
  battery?: (Battery & { seller: User }) | null;
  batteries?: (Battery & { seller: User })[]; // Thêm batteries vào type
};

export const contractService = {
  // HÀM MỚI: Chỉ tạo record trong DB, không tạo PDF
  createContractRecord: async (transaction: TransactionWithDetails) => {
    const listing =
      transaction.vehicle ||
      transaction.battery ||
      (transaction.batteries && transaction.batteries[0]);

    if (!listing) {
      logger.error(
        `Could not find any listing for transaction ${transaction.id} to create contract record.`,
      );
      return;
    }

    const seller =
      transaction.vehicle?.seller ||
      transaction.battery?.seller ||
      (transaction.batteries && transaction.batteries[0]?.seller);

    const buyer = transaction.buyer;
    if (!seller || !buyer) {
      logger.error(
        `Could not find seller or buyer for transaction ${transaction.id}`,
      );
      return;
    }

    await prisma.contract.upsert({
      where: { transactionId: transaction.id },
      update: {},
      create: {
        transactionId: transaction.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        contractUrl: null, // URL sẽ được cập nhật sau khi tạo PDF
      },
    });
  },

  // HÀM MỚI: Render hợp đồng ra HTML
  renderContractAsHtml: async (transactionId: string, userId: string) => {
    const transaction = await contractService.getTransactionForContract(
      transactionId,
      userId,
    );

    const { htmlContent } = await contractService.getContractHtml(transaction);
    return htmlContent;
  },

  // HÀM MỚI: Tạo và tải PDF theo yêu cầu
  generateAndDownloadContract: async (
    transactionId: string,
    userId: string,
  ) => {
    const contract = await prisma.contract.findUnique({
      where: { transactionId },
    });

    if (!contract) {
      throw new NotFoundError("Contract record not found.");
    }
    if (userId !== contract.buyerId && userId !== contract.sellerId) {
      throw new ForbiddenError(
        "You are not authorized to access this contract.",
      );
    }

    // Nếu đã có URL, trả về ngay
    if (contract.contractUrl) {
      return contractService.getContractSignedUrl(transactionId, userId);
    }

    // Nếu chưa có, bắt đầu tạo PDF
    const transaction = await contractService.getTransactionForContract(
      transactionId,
      userId,
    );
    const { pdfBuffer, fileName } =
      await contractService.generatePdf(transaction);

    // Upload lên Supabase
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKETS.CONTRACTS)
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" });

    if (error) {
      throw new InternalServerError(
        `Failed to upload contract: ${error.message}`,
      );
    }

    const { data: publicUrlData } = supabase.storage
      .from(SUPABASE_BUCKETS.CONTRACTS)
      .getPublicUrl(fileName);

    // Cập nhật lại record trong DB
    await prisma.contract.update({
      where: { transactionId },
      data: { contractUrl: publicUrlData.publicUrl },
    });

    // Trả về signed URL
    return contractService.getContractSignedUrl(transactionId, userId);
  },

  // TÁCH LOGIC: Lấy dữ liệu giao dịch
  getTransactionForContract: async (transactionId: string, userId: string) => {
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        buyer: true,
        vehicle: { include: { seller: true } },
        battery: { include: { seller: true } },
        batteries: { include: { seller: true } },
      },
    });

    if (!transaction) throw new NotFoundError("Transaction not found.");
    if (transaction.buyerId !== userId) {
      const seller =
        transaction.vehicle?.seller ||
        transaction.battery?.seller ||
        transaction.batteries?.[0]?.seller;
      if (seller?.id !== userId) {
        throw new ForbiddenError(
          "You are not authorized to view this contract.",
        );
      }
    }
    return transaction as TransactionWithDetails;
  },

  // TÁCH LOGIC: Chỉ render HTML
  getContractHtml: async (transaction: TransactionWithDetails) => {
    const listing =
      transaction.vehicle ||
      transaction.battery ||
      (transaction.batteries && transaction.batteries[0]);
    if (!listing)
      throw new InternalServerError("Listing not found for contract");

    const seller = listing.seller;
    const buyer = transaction.buyer;
    if (!seller || !buyer)
      throw new InternalServerError("Seller or buyer not found for contract");

    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "contracts",
      "purchase.ejs",
    );

    const htmlContent = await ejs.renderFile(templatePath, {
      transactionId: transaction.id,
      date: format(new Date(), "dd/MM/yyyy"),
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      sellerName: seller.name,
      sellerEmail: seller.email,
      productTitle: listing.title,
      productType: transaction.vehicleId ? "Xe điện" : "Pin",
      price: transaction.finalPrice,
    });

    return { htmlContent };
  },

  // TÁCH LOGIC: Chỉ tạo PDF từ HTML
  generatePdf: async (transaction: TransactionWithDetails) => {
    const { htmlContent } = await contractService.getContractHtml(transaction);
    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
    });
    await browser.close();

    const fileName = `${transaction.id}.pdf`;
    return { pdfBuffer, fileName };
  },

  // Giữ nguyên hàm này
  getContractSignedUrl: async (transactionId: string, userId: string) => {
    const contract = await prisma.contract.findUnique({
      where: { transactionId },
    });

    if (!contract) {
      throw new NotFoundError("Contract not found for this transaction.");
    }

    if (userId !== contract.buyerId && userId !== contract.sellerId) {
      throw new ForbiddenError("You are not authorized to view this contract.");
    }

    const filePath = `${SUPABASE_BUCKETS.CONTRACTS}/${transactionId}.pdf`;
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKETS.CONTRACTS)
      .createSignedUrl(filePath, 3600);

    if (error) {
      throw new InternalServerError(
        `Failed to create signed URL: ${error.message}`,
      );
    }

    return data.signedUrl;
  },
};
