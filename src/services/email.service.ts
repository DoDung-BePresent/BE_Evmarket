/**
 * Node modules
 */
import ejs from "ejs";
import path from "path";
import { Resend } from "resend";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Libs
 */
import logger from "@/libs/logger";

const resend = new Resend(config.RESEND_API_KEY);

const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[],
) => {
  try {
    await resend.emails.send({
      from: "EV-Market <onboarding@resend.dev>",
      to,
      subject,
      html,
      attachments,
    });
    logger.info(`📧 Email sent to ${to} with subject: "${subject}"`);
  } catch (error) {
    logger.error(`❌ Failed to send email to ${to}`, error);
  }
};

export const emailService = {
  sendAccountLockedEmail: async (
    to: string,
    name: string | null,
    reason: string,
  ) => {
    const subject = "Your EV-Market Account Has Been Locked";

    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "emails",
      "accountLocked.ejs",
    );

    const html = await ejs.renderFile(templatePath, {
      name: name || "user",
      reason: reason,
      supportEmail: config.SMTP_USER,
    });

    await sendEmail(to, subject, html);
  },
  sendListingVerifiedEmail: async (
    to: string,
    name: string | null,
    listingTitle: string,
    isVerified: boolean,
  ) => {
    const subject = `Your Listing "${listingTitle}" Has Been ${isVerified ? "Approved" : "Rejected"}`;
    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "emails",
      "listingVerified.ejs",
    );

    const html = await ejs.renderFile(templatePath, {
      name: name || "user",
      listingTitle,
      isVerified,
    });

    await sendEmail(to, subject, html);
  },

  sendContractEmail: async (
    to: string,
    name: string | null,
    transactionId: string,
    pdfBuffer: Buffer,
  ) => {
    const subject = `Your Purchase Contract for Transaction #${transactionId}`;
    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "emails",
      "contractNotification.ejs",
    );

    const html = await ejs.renderFile(templatePath, {
      name: name || "user",
      transactionId,
    });

    await sendEmail(to, subject, html, [
      {
        filename: `contract-${transactionId}.pdf`,
        content: pdfBuffer,
      },
    ]);
  },
  sendPasswordResetEmail: async (
    to: string,
    name: string | null,
    resetUrl: string,
  ) => {
    const subject = "Reset Your EV-Market Password";
    const templatePath = path.join(
      process.cwd(),
      "src",
      "templates",
      "emails",
      "resetPassword.ejs",
    );

    const html = await ejs.renderFile(templatePath, {
      name: name || "user",
      resetUrl,
    });

    await sendEmail(to, subject, html);
  },
};
