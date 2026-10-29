interface VerificationEmailInput {
  code: string;
  expiresInMinutes: number;
  username: string;
  /** Deep link that opens the verify page with the code already filled in. */
  verifyUrl: string;
}

export interface RenderedEmail {
  subject: string;
  text: string;
  html: string;
}

const FONT_STACK =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO_STACK = "ui-monospace,SFMono-Regular,Menlo,Consolas,'Courier New',monospace";

export function renderVerificationEmail(input: VerificationEmailInput): RenderedEmail {
  const subject = `${input.code} is your Lydev Cloud verification code`;
  const name = escapeHtml(input.username);

  const text = [
    `Hi ${input.username},`,
    "",
    "Use this code to verify your Lydev Cloud account:",
    "",
    `    ${input.code}`,
    "",
    "Or open this link and the code is filled in for you:",
    input.verifyUrl,
    "",
    `The code expires in ${input.expiresInMinutes} minutes.`,
    "If you did not create a Lydev Cloud account, you can ignore this email.",
    "",
    "— Lydev Cloud",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${subject}</title>
  </head>
  <body style="margin:0;padding:0;background:#f1f5f9;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Your Lydev Cloud verification code is ${input.code}. It expires in ${input.expiresInMinutes} minutes.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden;font-family:${FONT_STACK};">
            <tr>
              <td style="padding:36px 36px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="width:34px;height:34px;border-radius:10px;background:#2563eb;color:#ffffff;font-size:16px;font-weight:700;text-align:center;line-height:34px;font-family:${FONT_STACK};">L</td>
                    <td style="padding-left:10px;font-size:15px;font-weight:600;letter-spacing:0.01em;color:#0f172a;">Lydev Cloud</td>
                  </tr>
                </table>
                <h1 style="margin:24px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">Verify your email</h1>
                <p style="margin:10px 0 0;font-size:15px;line-height:1.65;color:#475569;">
                  Hi ${name}, enter the code below to finish setting up your account.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:24px 16px;">
                      <div style="font-family:${MONO_STACK};font-size:34px;font-weight:700;letter-spacing:0.34em;color:#0f172a;text-indent:0.34em;-webkit-user-select:all;user-select:all;">${input.code}</div>
                    </td>
                  </tr>
                </table>
                <p style="margin:10px 0 0;font-size:12px;line-height:1.6;color:#94a3b8;text-align:center;">
                  Tap the code to select it, or use the button below and it is filled in for you.
                </p>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 36px 0;">
                <a href="${input.verifyUrl}" style="display:inline-block;padding:13px 26px;border-radius:10px;background:#2563eb;color:#ffffff;font-family:${FONT_STACK};font-size:15px;font-weight:600;text-decoration:none;">Verify my email</a>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
                  The code expires in <strong style="color:#334155;">${input.expiresInMinutes} minutes</strong>. If the button does not work, copy this link into your browser:
                </p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.5;word-break:break-all;">
                  <a href="${input.verifyUrl}" style="color:#2563eb;text-decoration:underline;">${input.verifyUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 0;">
                <div style="border-top:1px solid #e2e8f0;padding-top:18px;">
                  <p style="margin:0;font-size:12px;line-height:1.6;color:#94a3b8;">
                    You received this email because someone signed up for Lydev Cloud with this address. If that was not you, no action is needed and the code will expire on its own.
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 36px 32px;">
                <p style="margin:0;font-size:12px;color:#94a3b8;">
                  Lydev Cloud · cloud.lydev.id
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
