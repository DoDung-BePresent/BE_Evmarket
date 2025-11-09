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
};

export const contractService = {
  generateAndSaveContract: async (transaction: TransactionWithDetails) => {
    const listing = transaction.vehicle || transaction.battery;
    if (!listing) return;

    const seller = listing.seller;
    const buyer = transaction.buyer;

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

    const browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });
    await browser.close();

    const fileName = `${SUPABASE_BUCKETS.CONTRACTS}/${transaction.id}.pdf`;
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

    await prisma.contract.create({
      data: {
        transactionId: transaction.id,
        buyerId: buyer.id,
        sellerId: seller.id,
        contractUrl: publicUrlData.publicUrl, //TODO: Lưu URL public để dễ truy cập, nhưng bucket nên là private
      },
    });
  },
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
