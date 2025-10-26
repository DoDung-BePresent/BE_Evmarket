import nodemailer from "nodemailer";
import config from "@/configs/env.config";
import logger from "@/libs/logger";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE, // true for 465, false for other ports
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
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Account Locked</h2>
        <p>Hello ${name || "user"},</p>
        <p>We are writing to inform you that your account on EV-Market has been locked by an administrator.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>If you believe this is a mistake or wish to appeal this decision, please contact our support team at <a href="mailto:${config.SMTP_USER}">${config.SMTP_USER}</a>.</p>
        <p>Thank you for your understanding.</p>
        <p>Best regards,<br/>The EV-Market Team</p>
      </div>
    `;
    await sendEmail(to, subject, html);
  }
};
