import { Resend } from 'resend';
import dotenv from "dotenv";


dotenv.config();
// Make sure process.env.RESEND_API_KEY exists in your backend .env file
const resend = new Resend(process.env.RESEND_API_KEY);

// Base reusable email sender using HTML
const sendEmail = async (to, subject, htmlContent) => {
  try {
    const data = await resend.emails.send({
      from: 'ACT Path <bot@act-ptsd.com>', 
      to,
      subject,
      html: htmlContent, 
    });
    return data;
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Could not send email");
  }
};

// ── Specific Email Templates ─────────────────────────────────────────────

// Merged Welcome + MFA Email for Registration
export const sendWelcomeWithMFAEmail = async (email, name, mfaCode) => {
  const subject = "Welcome to ACT Path - Your Authentication Code";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; color: #333;">
      <h2 style="color: #4f46e5;">Welcome to ACT Path, ${name}!</h2>
      <p>We are thrilled to have you join us on your journey to recovery and resilience.</p>
      <p>To complete your registration and secure your account, please use the following 6-digit authentication code:</p>
      
      <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; margin: 24px 0;">
        <h1 style="font-size: 36px; letter-spacing: 8px; color: #4f46e5; margin: 0;">${mfaCode}</h1>
      </div>
      
      <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you need a new code, you can request one from the login screen.</p>
      <br/>
      <p>Best regards,<br/><strong>The ACT Path Team</strong></p>
    </div>
  `;
  return sendEmail(email, subject, html);
};

// Standard MFA Email for returning users logging in
export const sendMFAEmail = async (email, mfaCode) => {
  const subject = "Your ACT Path Authentication Code";
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; color: #333;">
      <h2>Authentication Code</h2>
      <p>Please use the following 6-digit code to complete your secure login:</p>
      
      <div style="background-color: #f3f4f6; padding: 24px; border-radius: 12px; margin: 24px 0;">
        <h1 style="font-size: 36px; letter-spacing: 8px; color: #4f46e5; margin: 0;">${mfaCode}</h1>
      </div>
      
      <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you did not attempt to log in, please secure your account.</p>
    </div>
  `;
  return sendEmail(email, subject, html);
};