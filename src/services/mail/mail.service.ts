import "server-only";
import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { renderVerificationEmail } from "@/services/mail/templates";
import { getTransporter, isMailConfigured } from "@/services/mail/transport";

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Returns false when the message could not be handed to the SMTP server so the
 * caller can tell the user to retry instead of failing the whole request.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  if (!isMailConfigured()) {
    if (env.NODE_ENV === "production") {
      logger.error({ to: message.to }, "SMTP credentials are missing");
      throw new AppError("SERVICE_UNAVAILABLE", "Email delivery is not available.", 503);
    }

    logger.warn(
      { to: message.to, subject: message.subject },
      "SMTP is not configured; skipping delivery",
    );

    return false;
  }

  try {
    await getTransporter().sendMail({
      from: `"${env.MAIL_FROM_NAME}" <${env.MAIL_FROM}>`,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return true;
  } catch (error) {
    logger.error({ err: error, to: message.to }, "Email delivery failed");

    return false;
  }
}

export interface VerificationMailInput {
  to: string;
  username: string;
  code: string;
  expiresInMinutes: number;
}

export async function sendVerificationCodeEmail(
  input: VerificationMailInput,
): Promise<boolean> {
  const appUrl = env.APP_URL.replace(/\/$/, "");
  const verifyUrl = `${appUrl}/verify-email?email=${encodeURIComponent(input.to)}&code=${input.code}`;

  const rendered = renderVerificationEmail({
    code: input.code,
    expiresInMinutes: input.expiresInMinutes,
    username: input.username,
    verifyUrl,
  });

  const sent = await sendMail({ to: input.to, ...rendered });

  if (!sent && env.NODE_ENV !== "production") {
    logger.info(
      { email: input.to, code: input.code },
      "Verification code (dev fallback, email not sent)",
    );
  }

  return sent;
}
