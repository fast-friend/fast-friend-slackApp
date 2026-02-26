import { Resend } from "resend";
import { env } from "../config/env.config";

if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
  console.warn("⚠️  RESEND_API_KEY or FROM_EMAIL not set — email sending will be disabled.");
}

const resend = new Resend(env.RESEND_API_KEY ?? "");

/* ─── Design Tokens (mirrors client/src/theme/theme.ts) ─────────── */
const design = {
  primary: "#E57B2C",
  primaryLight: "#F39857",
  primaryDark: "#C66A23",
  darkBrown: "#2D241F",
  gray: "#5B514A",
  lightBeige: "#D9C7AC",
  bgPage: "#FAF9F7",
  bgCard: "#FFFFFF",
  border: "#EAE6DD",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

/* ─── Shared email shell ─────────────────────────────────────────── */
const emailShell = (bodyContent: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${design.font};
      background: ${design.bgPage};
      padding: 40px 20px;
      color: ${design.darkBrown};
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: ${design.bgCard};
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid ${design.border};
      box-shadow: 0 4px 24px rgba(45, 36, 31, 0.10);
    }
    /* ── Header ── */
    .header {
      background: ${design.darkBrown};
      padding: 36px 32px;
      text-align: center;
    }
    .header-logo {
      display: inline-block;
      background: ${design.primary};
      border-radius: 12px;
      width: 48px;
      height: 48px;
      line-height: 48px;
      font-size: 22px;
      margin-bottom: 14px;
    }
    .header h1 {
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }
    .header p {
      color: ${design.lightBeige};
      font-size: 13px;
      margin-top: 5px;
    }
    /* ── Body ── */
    .body {
      padding: 40px 32px;
    }
    .body p {
      color: ${design.gray};
      font-size: 15px;
      line-height: 1.65;
      margin-bottom: 24px;
    }
    /* ── OTP box ── */
    .otp-box {
      background: ${design.bgPage};
      border: 2px solid ${design.lightBeige};
      border-left: 4px solid ${design.primary};
      border-radius: 12px;
      padding: 28px 24px;
      text-align: center;
      margin-bottom: 24px;
    }
    .otp-code {
      font-size: 44px;
      font-weight: 800;
      letter-spacing: 14px;
      color: ${design.primary};
      font-family: 'Courier New', monospace;
    }
    .otp-expiry {
      color: ${design.gray};
      font-size: 13px;
      margin-top: 10px;
    }
    /* ── CTA button ── */
    .btn-wrapper {
      text-align: center;
      margin-bottom: 24px;
    }
    .btn {
      display: inline-block;
      background: ${design.primary};
      color: #FFFFFF !important;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 36px;
      border-radius: 10px;
      text-decoration: none;
      letter-spacing: 0.2px;
    }
    /* ── Link fallback ── */
    .link-fallback {
      background: ${design.bgPage};
      border: 1px solid ${design.border};
      border-radius: 10px;
      padding: 14px 16px;
      font-size: 12px;
      color: ${design.gray};
      word-break: break-all;
      margin-bottom: 24px;
    }
    .link-fallback a {
      color: ${design.primary};
    }
    /* ── Notice box ── */
    .notice {
      background: #FFF5EC;
      border-left: 4px solid ${design.primary};
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: ${design.primaryDark};
      margin-bottom: 24px;
      line-height: 1.55;
    }
    /* ── Divider ── */
    .divider {
      border: none;
      border-top: 1px solid ${design.border};
      margin: 0;
    }
    /* ── Footer ── */
    .footer {
      padding: 24px 32px;
      text-align: center;
      color: #9CA3AF;
      font-size: 12px;
      line-height: 1.7;
    }
  </style>
</head>
<body>
  <div class="container">
    ${bodyContent}
  </div>
</body>
</html>
`;

/**
 * Send a 6-digit OTP email for signup verification
 */
export const sendOtpEmail = async (to: string, otp: string): Promise<void> => {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    throw new Error("Email service not configured. Please set RESEND_API_KEY and FROM_EMAIL in .env");
  }

  const { error } = await resend.emails.send({
    from: env.FROM_EMAIL,
    to,
    subject: "Your Fast Friends verification code",
    html: emailShell(`
      <div class="header">
        <div class="header-logo">🦝</div>
        <h1>Fast Friends</h1>
        <p>Team engagement, made fun.</p>
      </div>

      <div class="body">
        <p>Hi there! Thanks for signing up. To verify your email address, use the One-Time Password below:</p>

        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <div class="otp-expiry">⏱️ Expires in <strong>10 minutes</strong></div>
        </div>

        <div class="notice">
          🔒 Never share this code with anyone. Fast Friends will never ask for your OTP.
        </div>

        <p>If you didn't create a Fast Friends account, you can safely ignore this email.</p>
      </div>

      <hr class="divider" />
      <div class="footer">
        <p>© ${new Date().getFullYear()} Fast Friends. All rights reserved.</p>
        <p>This is an automated message — please do not reply.</p>
      </div>
    `),
  });

  if (error) {
    console.error("Resend OTP email error:", error);
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

/**
 * Send a password reset link email
 */
export const sendPasswordResetEmail = async (
  to: string,
  resetLink: string
): Promise<void> => {
  if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
    throw new Error("Email service not configured. Please set RESEND_API_KEY and FROM_EMAIL in .env");
  }

  const { error } = await resend.emails.send({
    from: env.FROM_EMAIL,
    to,
    subject: "Reset your Fast Friends password",
    html: emailShell(`
      <div class="header">
        <div class="header-logo">🔐</div>
        <h1>Fast Friends</h1>
        <p>Password reset request</p>
      </div>

      <div class="body">
        <p>We received a request to reset the password for your Fast Friends account. Click the button below to choose a new password:</p>

        <div class="btn-wrapper">
          <a href="${resetLink}" class="btn">Reset My Password</a>
        </div>

        <div class="notice">
          ⏱️ This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
        </div>
      </div>

      <hr class="divider" />
      <div class="footer">
        <p>© ${new Date().getFullYear()} Fast Friends. All rights reserved.</p>
        <p>This is an automated message — please do not reply.</p>
      </div>
    `),
  });

  if (error) {
    console.error("Resend password reset email error:", error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};
