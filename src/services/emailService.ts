/**
 * Email Service for Tele-Commerce SaaS Backend
 */

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<void> {
  const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const resetUrl = `${frontendUrl}/#/reset-password?token=${resetToken}`;

  console.log(`[EMAIL SERVICE] Password reset link generated for ${toEmail}:`);
  console.log(` -> Reset Link: ${resetUrl}`);

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || "onboarding@resend.dev";

  if (resendApiKey) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: `Tele-Commerce <${fromEmail}>`,
          to: [toEmail],
          subject: "Reset your Tele-Commerce Merchant Account Password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #4f46e5;">Reset Your Password</h2>
              <p>You requested a password reset for your <strong>Tele-Commerce</strong> merchant account.</p>
              <p>Click the button below to set a new password. This link is valid for 1 hour:</p>
              <div style="margin: 25px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="color: #666666; font-size: 14px;">If you did not request a password reset, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 20px 0;" />
              <p style="color: #999999; font-size: 12px;">Tele-Commerce SaaS Platform</p>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        console.error("[EMAIL SERVICE] Failed to send email via Resend:", errJson);
      } else {
        console.log(`[EMAIL SERVICE] Password reset email successfully sent to ${toEmail} via Resend.`);
      }
    } catch (err) {
      console.error("[EMAIL SERVICE] Error sending email via Resend:", err);
    }
  }
}
