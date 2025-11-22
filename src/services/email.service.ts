/**
 * Node modules
 */
import ejs from "ejs";
import path from "path";
import * as Brevo from "@getbrevo/brevo";

/**
 * Configs
 */
import config from "@/configs/env.config";

/**
 * Libs
 */
import logger from "@/libs/logger";
import { InternalServerError } from "@/libs/error";

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  Brevo.TransactionalEmailsApiApiKeys.apiKey,
  config.BREVO_API_KEY,
);

const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  attachments?: { filename: string; content: Buffer }[],
) => {
  const sendSmtpEmail = new Brevo.SendSmtpEmail();

  sendSmtpEmail.sender = {
    name: "EV-Market",
    email: "doquangdung1782004@gmail.com",
  };
  sendSmtpEmail.to = [{ email: to }];
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = html;

  if (attachments && attachments.length > 0) {
    sendSmtpEmail.attachment = attachments.map((att) => ({
      name: att.filename,
      content: att.content.toString("base64"),
    }));
  }

  try {
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info(`📧 Email sent to ${to} with subject: "${subject}" via Brevo`);
  } catch (error) {
    logger.error(`❌ Failed to send email to ${to} via Brevo`, error);
    throw new InternalServerError("Failed to send email.");
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
      supportEmail: "doquangdung1782004@gmail.com",
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
    pdfBuffer?: Buffer,
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

    const attachments = [];
    if (pdfBuffer) {
      attachments.push({
        filename: `contract-${transactionId}.pdf`,
        content: pdfBuffer,
      });
    }

    await sendEmail(to, subject, html, attachments);
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
