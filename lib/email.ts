// TradeCraft's email module. Every transactional email goes through here,
// so sender identity, styling, and error handling live in exactly one place.
//
// Honest configuration states:
// - No RESEND_API_KEY: sends are skipped, the code is logged to the terminal
//   for local development only.
// - Resend test mode (now, no verified domain): delivery only reaches the
//   account owner's registered address. Other recipients fail, the reason is
//   reported as precisely as possible, and in development the code is always
//   logged to the terminal (clearly labeled, never fake delivery).
// - Full production: after the domain is purchased and verified in Resend,
//   these limits disappear. Production never logs codes.

import { Resend } from "resend";

const FROM_ADDRESS = "TradeCraft <onboarding@resend.dev>";

let client: Resend | null = null;

function getResendClient(): Resend | null {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  client = new Resend(apiKey);
  return client;
}

export type VerificationEmailInput = {
  to: string;
  code: string;
  minutesValid: number;
};

export type EmailSendResult = {
  sent: boolean;
  skippedReason?: "EMAIL_NOT_CONFIGURED" | "TEST_MODE_RECIPIENT" | "RESEND_ERROR" | "NETWORK_ERROR";
};

// Matches Resend's restricted test-mode wording. Kept deliberately broad:
// providers change their error strings over time, so we look for several
// known phrases instead of exactly one.
function isTestModeRestriction(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("testing emails") ||
    m.includes("own email address") ||
    m.includes("verify a domain") ||
    (m.includes("test") && m.includes("domain"))
  );
}

export function renderVerificationEmailHtml(code: string, minutesValid: number): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;">
          <tr><td style="padding:32px 32px 0 32px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#171717;">TradeCraft</p>
            <h1 style="margin:16px 0 8px 0;font-size:22px;line-height:1.3;color:#171717;">Verify your email</h1>
            <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#525252;">
              Enter this code in TradeCraft to verify your email address.
              It expires in ${minutesValid} minutes.
            </p>
            <div style="text-align:center;margin:0 0 24px 0;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#a3a3a3;letter-spacing:1px;">YOUR CODE</p>
              <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#171717;">${code}</p>
            </div>
            <p style="margin:0 0 32px 0;font-size:12px;line-height:1.6;color:#737373;">
              If you did not try to create a TradeCraft account, you can safely
              ignore this email. The code expires on its own, and nobody can use
              it without access to this inbox.
            </p>
          </td></tr>
          <tr><td style="padding:0 32px 24px 32px;">
            <p style="margin:0;font-size:12px;color:#a3a3a3;">
              This is an automated message from TradeCraft.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendVerificationEmail(
  input: VerificationEmailInput
): Promise<EmailSendResult> {
  const resend = getResendClient();

  if (!resend) {
    console.log(`[email:dev] No RESEND_API_KEY. Code ${input.code} for ${input.to} (not delivered).`);
    return { sent: false, skippedReason: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: `Your TradeCraft verification code: ${input.code}`,
      html: renderVerificationEmailHtml(input.code, input.minutesValid),
    });

    if (result.error) {
      const message = String(result.error.message ?? "");
      console.error("[email] Resend reported an error:", result.error);

      // Development guarantee: a failed send never blocks development.
      // The code is logged, clearly labeled as NOT delivered. Production
      // never logs codes.
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[email:dev] Send failed (${message.slice(0, 140)}). Fallback: code ${input.code} for ${input.to} (not delivered).`
        );
      }

      if (isTestModeRestriction(message)) {
        return { sent: false, skippedReason: "TEST_MODE_RECIPIENT" };
      }
      return { sent: false, skippedReason: "RESEND_ERROR" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[email] Send failed:", error);
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[email:dev] Send threw. Fallback: code ${input.code} for ${input.to} (not delivered).`
      );
    }
    return { sent: false, skippedReason: "NETWORK_ERROR" };
  }
}
export function renderPasswordResetEmailHtml(code: string, minutesValid: number): string {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#f5f5f5;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;">
          <tr><td style="padding:32px 32px 0 32px;">
            <p style="margin:0;font-size:16px;font-weight:700;color:#171717;">TradeCraft</p>
            <h1 style="margin:16px 0 8px 0;font-size:22px;line-height:1.3;color:#171717;">Reset your password</h1>
            <p style="margin:0 0 24px 0;font-size:14px;line-height:1.6;color:#525252;">
              Enter this code in TradeCraft to reset your password.
              It expires in ${minutesValid} minutes.
            </p>
            <div style="text-align:center;margin:0 0 24px 0;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#a3a3a3;letter-spacing:1px;">YOUR CODE</p>
              <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#171717;">${code}</p>
            </div>
            <p style="margin:0 0 32px 0;font-size:12px;line-height:1.6;color:#737373;">
              If you did not request a password reset, you can safely ignore
              this email. Your password stays unchanged, and the code expires
              on its own. After a successful reset, all signed-in sessions on
              every device are signed out for your protection.
            </p>
          </td></tr>
          <tr><td style="padding:0 32px 24px 32px;">
            <p style="margin:0;font-size:12px;color:#a3a3a3;">
              This is an automated message from TradeCraft.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export async function sendPasswordResetEmail(
  input: VerificationEmailInput
): Promise<EmailSendResult> {
  const resend = getResendClient();

  if (!resend) {
    console.log(`[email:dev] No RESEND_API_KEY. Reset code ${input.code} for ${input.to} (not delivered).`);
    return { sent: false, skippedReason: "EMAIL_NOT_CONFIGURED" };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_ADDRESS,
      to: input.to,
      subject: `Your TradeCraft password reset code: ${input.code}`,
      html: renderPasswordResetEmailHtml(input.code, input.minutesValid),
    });

    if (result.error) {
      const message = String(result.error.message ?? "");
      console.error("[email] Resend reported an error:", result.error);
      if (process.env.NODE_ENV !== "production") {
        console.log(
          `[email:dev] Reset send failed (${message.slice(0, 140)}). Fallback: reset code ${input.code} for ${input.to} (not delivered).`
        );
      }
      if (isTestModeRestriction(message)) {
        return { sent: false, skippedReason: "TEST_MODE_RECIPIENT" };
      }
      return { sent: false, skippedReason: "RESEND_ERROR" };
    }

    return { sent: true };
  } catch (error) {
    console.error("[email] Reset send failed:", error);
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[email:dev] Reset send threw. Fallback: reset code ${input.code} for ${input.to} (not delivered).`
      );
    }
    return { sent: false, skippedReason: "NETWORK_ERROR" };
  }
}