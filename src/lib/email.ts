import nodemailer from "nodemailer";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

function getTransporter(): Promise<nodemailer.Transporter> | null {
  if (!transporterPromise) {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === "true";
    if (!host || !port || !user || !pass) {
      console.warn("[Gardenit] SMTP credentials missing. Emails will be logged to console.");
      return null;
    }
    transporterPromise = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }
  return transporterPromise;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@gardenit.app";
  if (!transporter) {
    console.info(`[Gardenit] Email to ${to}: ${subject}\n${text}`);
    return false;
  }
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html: html ?? `<p>${text}</p>`,
  });
  return true;
}
