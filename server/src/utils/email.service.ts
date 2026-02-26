import { Resend } from "resend";
import { env } from "../config/env.config";

if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
  console.warn("⚠️  RESEND_API_KEY or FROM_EMAIL not set — email sending will be disabled.");
}

const resend = new Resend(env.RESEND_API_KEY ?? "");

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
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Email Verification</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 32px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 6px; }
          .body { padding: 40px 32px; }
          .body p { color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .otp-box { background: #f9fafb; border: 2px dashed #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px; }
          .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 12px; color: #6366f1; font-family: 'Courier New', monospace; }
          .expiry { color: #6b7280; font-size: 13px; margin-top: 8px; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px; }
          .footer { border-top: 1px solid #f3f4f6; padding: 24px 32px; text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fast Friends 🎉</h1>
            <p>Team engagement, made fun.</p>
          </div>
          <div class="body">
            <p>Hi there! Thanks for signing up. To verify your email address, use the One-Time Password below:</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
              <div class="expiry">⏱️ Expires in <strong>10 minutes</strong></div>
            </div>
            <div class="warning">
              🔒 Never share this code with anyone. Fast Friends will never ask for your OTP.
            </div>
            <p>If you didn't create a Fast Friends account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Fast Friends. All rights reserved.</p>
            <p>This is an automated message — please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
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
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Password Reset</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; padding: 40px 20px; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 32px; text-align: center; }
          .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 6px; }
          .body { padding: 40px 32px; }
          .body p { color: #374151; font-size: 15px; line-height: 1.6; margin-bottom: 24px; }
          .btn-wrapper { text-align: center; margin-bottom: 24px; }
          .btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff !important; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px; }
          .link-fallback { background: #f9fafb; border-radius: 8px; padding: 14px 16px; font-size: 12px; color: #6b7280; word-break: break-all; margin-bottom: 24px; }
          .link-fallback a { color: #6366f1; }
          .warning { background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #92400e; margin-bottom: 24px; }
          .footer { border-top: 1px solid #f3f4f6; padding: 24px 32px; text-align: center; color: #9ca3af; font-size: 12px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Fast Friends 🔐</h1>
            <p>Password reset request</p>
          </div>
          <div class="body">
            <p>We received a request to reset the password for your Fast Friends account. Click the button below to choose a new password:</p>
            <div class="btn-wrapper">
              <a href="${resetLink}" class="btn">Reset My Password</a>
            </div>
            <p style="font-size: 13px; color: #6b7280; margin-bottom: 12px;">If the button doesn't work, copy and paste this link into your browser:</p>
            <div class="link-fallback">
              <a href="${resetLink}">${resetLink}</a>
            </div>
            <div class="warning">
              ⏱️ This link expires in <strong>1 hour</strong>. If you did not request a password reset, please ignore this email — your password will remain unchanged.
            </div>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Fast Friends. All rights reserved.</p>
            <p>This is an automated message — please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  });

  if (error) {
    console.error("Resend password reset email error:", error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
};
