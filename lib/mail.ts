import nodemailer from "nodemailer";

/**
 * SMTP email (cPanel gives you a mailbox; use its SMTP settings):
 *   SMTP_HOST=mail.yourdomain.com  SMTP_PORT=465  SMTP_USER=alerts@yourdomain.com  SMTP_PASS=...  MAIL_FROM="SEO Audit <alerts@yourdomain.com>"
 */
export function mailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!mailConfigured()) throw new Error("SMTP is not configured");
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
}
