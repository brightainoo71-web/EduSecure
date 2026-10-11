import nodemailer, { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

export const getEmailTransporter = () => {
  if (transporter) return transporter;

  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = parseInt((process.env.SMTP_PORT || '587').trim(), 10);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, '');

  if (user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    console.log(`[EMAIL] SMTP Transporter configured with ${user} via ${host}`);
  } else {
    // Development fallback: logs cleanly to console if SMTP credentials are not yet configured
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
      buffer: true,
    });
    console.log('[EMAIL] Running in console/development mailer mode. (Set SMTP_USER & SMTP_PASS in .env for live Gmail delivery)');
  }

  return transporter;
};

export const sendVerificationEmail = async (email: string, username: string, code: string) => {
  const mailer = getEmailTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '"EduSecure School System" <noreply@edusecure.org>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #1e3a8a; padding: 16px; border-radius: 8px; text-align: center; color: #ffffff; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px;">EduSecure School Portal</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">Email Verification & Security Confirmation</p>
      </div>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${username}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Thank you for registering your school account. To complete your activation and verify your email address, please enter the 6-digit confirmation code below:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e3a8a; background: #eff6ff; padding: 14px 28px; border-radius: 8px; border: 1px dashed #3b82f6;">
          ${code}
        </span>
      </div>
      <p style="color: #64748b; font-size: 13px;">This verification code is valid for 15 minutes. If you did not request this, please disregard this email.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">EduSecure School Management System • Confidential & Secure</p>
    </div>
  `;

  try {
    const info = await mailer.sendMail({
      from,
      to: email,
      subject: `[EduSecure] Your Email Verification Code: ${code}`,
      html,
      text: `Hello ${username},\n\nYour EduSecure verification code is: ${code}\nThis code expires in 15 minutes.`,
    });

    console.log(`[EMAIL] Verification code [${code}] dispatched to ${email}`);
    if ((info as any).message) {
      console.log(`[EMAIL PREVIEW (Dev)]: \n${(info as any).message.toString()}`);
    }
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed sending verification email to ${email}:`, error);
    return false;
  }
};

export const sendTotpEmail = async (email: string, username: string, code: string) => {
  const mailer = getEmailTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || '"EduSecure School Security" <security@edusecure.org>';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; text-align: center; color: #ffffff; margin-bottom: 20px;">
        <h2 style="margin: 0; font-size: 20px;">EduSecure 2FA Security</h2>
        <p style="margin: 5px 0 0 0; font-size: 13px; color: #38bdf8;">Two-Factor Authentication Code</p>
      </div>
      <p style="color: #334155; font-size: 15px;">Hello <strong>${username}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        A sign-in attempt was detected for your account. Enter the 6-digit security code below to complete your authentication:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0284c7; background: #f0f9ff; padding: 14px 28px; border-radius: 8px; border: 1px solid #bae6fd;">
          ${code}
        </span>
      </div>
      <p style="color: #64748b; font-size: 13px;">This code is valid for 5 minutes. If you did not attempt to sign in, please immediately alert your School Administrator.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 25px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center;">EduSecure School Management System • Security Alert</p>
    </div>
  `;

  try {
    const info = await mailer.sendMail({
      from,
      to: email,
      subject: `[EduSecure 2FA] Your Sign-In Security Code: ${code}`,
      html,
      text: `Hello ${username},\n\nYour 2FA security login code is: ${code}\nThis code is valid for 5 minutes.`,
    });

    console.log(`[EMAIL 2FA] Code [${code}] dispatched to ${email}`);
    if ((info as any).message) {
      console.log(`[EMAIL 2FA PREVIEW (Dev)]: \n${(info as any).message.toString()}`);
    }
    return true;
  } catch (error) {
    console.error(`[EMAIL ERROR] Failed sending 2FA email to ${email}:`, error);
    return false;
  }
};
