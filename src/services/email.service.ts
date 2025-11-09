/**
 * Node modules
 */
import ejs from "ejs";
import path from "path";
import nodemailer from "nodemailer";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Libs
 */
import logger from "@/libs/logger";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: `EV-Market <${config.SMTP_USER}>`,
      to,
      subject,
      html,
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
};
