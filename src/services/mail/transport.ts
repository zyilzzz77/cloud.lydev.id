import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

const globalForMail = globalThis as unknown as { lydevTransporter?: Transporter };

export function isMailConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export function getTransporter(): Transporter {
  if (globalForMail.lydevTransporter) {
    return globalForMail.lydevTransporter;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  if (env.NODE_ENV !== "production") {
    globalForMail.lydevTransporter = transporter;
  }

  return transporter;
}
