import { Request, Response } from 'express';
import { createRequire } from 'module';
import QRCode from 'qrcode';
import { getDb } from '../config/firebase.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { verifyPre2FAToken, generateAccessToken, generateRefreshToken } from '../utils/token.js';
import { UserDocument } from '../types/user.js';

import { sendTotpEmail } from '../services/email.service.js';

const require = createRequire(import.meta.url);
const otplib = require('otplib');

// Helper to support both otplib v12 and v13+ safely
const generateOtpSecret = (): string => {
  if (typeof otplib.generateSecret === 'function') return otplib.generateSecret();
  if (otplib.authenticator && typeof otplib.authenticator.generateSecret === 'function') {
    return otplib.authenticator.generateSecret();
  }
  return (otplib.default || otplib).generateSecret();
};

const generateOtpCode = (secret: string): string => {
  if (typeof otplib.generateSync === 'function') return otplib.generateSync({ secret });
  if (typeof otplib.generate === 'function') {
    try {
      return otplib.generate({ secret });
    } catch {
      return (otplib as any).generate(secret);
    }
  }
  if (otplib.authenticator && typeof otplib.authenticator.generate === 'function') {
    return otplib.authenticator.generate(secret);
  }
  return '';
};

const verifyOtpCode = (token: string, secret: string, userData?: UserDocument): boolean => {
  // 1. Check if the code matches a recently emailed 2FA code within its 5-minute validity window
  if (
    userData?.emailTwoFactorCode &&
    userData?.emailTwoFactorExpires &&
    userData.emailTwoFactorCode === token.trim() &&
    new Date(userData.emailTwoFactorExpires) > new Date()
  ) {
    return true;
  }

  // 2. Otherwise verify against RFC 6238 TOTP (Google Authenticator) with 60s clock drift tolerance
  try {
    if (typeof otplib.verifySync === 'function') {
      const res = otplib.verifySync({ token, secret, epochTolerance: 60 });
      return !!(res && (res.valid === true || res === true));
    }
    if (typeof otplib.verify === 'function') {
      const res = otplib.verify({ token, secret });
      return !!(res && (res.valid === true || res === true));
    }
    if (otplib.authenticator && typeof otplib.authenticator.verify === 'function') {
      return otplib.authenticator.verify({ token, secret });
    }
  } catch (err) {
    console.error('[OTP VERIFY ERROR]', err);
  }
  return false;
};

const APP_NAME = 'EduSecure';

/**
 * Initiates 2FA setup: generates secret, encrypts it, stores temporarily, returns QR code,
 * and also dispatches the current 2FA code to user's registered email inbox.
 */
export const setup2FA = async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const db = getDb();
    const userDocRef = db.collection('users').doc(user.username);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const userData = userDoc.data() as UserDocument;
    if (userData.isTwoFactorEnabled) {
      return res.status(400).json({ status: 'error', message: '2FA is already enabled' });
    }

    // Generate RFC 6238 base32 secret
    const secret = generateOtpSecret();

    // Standard RFC 6238 TOTP URI: otpauth://totp/Issuer:account?secret=...&issuer=Issuer
    const label = encodeURIComponent(`${APP_NAME}:${user.username}`);
    const issuer = encodeURIComponent(APP_NAME);
    const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    // Compute initial TOTP code and send to user's email if available
    const initialCode = generateOtpCode(secret);
    const emailExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    if (userData.email) {
      await sendTotpEmail(userData.email, userData.username, initialCode);
    }

    // Encrypt secret with AES-256-GCM before saving to Firestore
    const encryptedSecret = encrypt(secret);
    await userDocRef.update({
      twoFactorSecret: encryptedSecret,
      emailTwoFactorCode: initialCode,
      emailTwoFactorExpires: emailExpires,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 'success',
      message: userData.email
        ? `2FA code also dispatched to ${userData.email}. You can also scan the QR code.`
        : 'Scan the QR code with an authenticator app (Google Authenticator, Authy)',
      qrCode: qrCodeDataUrl,
      secret,
      emailSentTo: userData.email || null,
    });
  } catch (error: any) {
    console.error('[2FA SETUP ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to initiate 2FA setup' });
  }
};

/**
 * Verifies the first 6-digit code and activates 2FA on the account.
 */
export const verifyAndEnable2FA = async (req: Request, res: Response) => {
  try {
    const { token, code, totpToken } = req.body;
    const submittedToken = (token || code || totpToken || '').trim();
    if (!submittedToken) {
      return res.status(400).json({ status: 'error', message: 'Verification code is required' });
    }

    const user = req.user!;
    const db = getDb();
    const userDocRef = db.collection('users').doc(user.username);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const userData = userDoc.data() as UserDocument;
    if (!userData.twoFactorSecret) {
      return res.status(400).json({ status: 'error', message: '2FA setup was not initiated' });
    }

    // Decrypt stored secret and verify code
    const rawSecret = decrypt(userData.twoFactorSecret);
    const isValid = verifyOtpCode(submittedToken, rawSecret, userData);

    if (!isValid) {
      return res.status(400).json({ status: 'error', message: 'Invalid 2FA code' });
    }

    // Activate 2FA and clear temporary email code
    await userDocRef.update({
      isTwoFactorEnabled: true,
      emailTwoFactorCode: '',
      emailTwoFactorExpires: '',
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 'success',
      message: 'Two-factor authentication successfully enabled',
    });
  } catch (error: any) {
    console.error('[2FA VERIFY ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to verify 2FA code' });
  }
};

/**
 * Dispatches a fresh 2FA code to the user's Gmail/inbox during login challenge.
 */
export const sendLogin2FACodeToEmail = async (req: Request, res: Response) => {
  try {
    const { pre2faToken } = req.body;
    if (!pre2faToken) {
      return res.status(400).json({ status: 'error', message: 'pre2faToken is required' });
    }

    let payload;
    try {
      payload = verifyPre2FAToken(pre2faToken);
    } catch {
      return res.status(401).json({ status: 'error', message: 'Pre-2FA token expired or invalid' });
    }

    const db = getDb();
    const userDocRef = db.collection('users').doc(payload.username);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const userData = userDoc.data() as UserDocument;
    if (!userData.isTwoFactorEnabled || !userData.twoFactorSecret) {
      return res.status(400).json({ status: 'error', message: '2FA is not enabled for this user' });
    }

    if (!userData.email) {
      return res.status(400).json({ status: 'error', message: 'No registered email found for this account' });
    }

    // Decrypt secret, generate current 6-digit code, store 5-min window, and email it
    const rawSecret = decrypt(userData.twoFactorSecret);
    const code = generateOtpCode(rawSecret);
    const emailExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await userDocRef.update({
      emailTwoFactorCode: code,
      emailTwoFactorExpires: emailExpires,
      updatedAt: new Date().toISOString(),
    });

    await sendTotpEmail(userData.email, userData.username, code);

    return res.status(200).json({
      status: 'success',
      message: `2FA security code sent to ${userData.email}`,
      email: userData.email,
    });
  } catch (error: any) {
    console.error('[SEND 2FA EMAIL ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to send 2FA code to email' });
  }
};

/**
 * Validates 2FA code during login for accounts with 2FA enabled.
 */
export const loginWith2FA = async (req: Request, res: Response) => {
  try {
    const { pre2faToken, code, token, totpToken } = req.body;
    const submittedCode = (code || token || totpToken || '').trim();

    if (!pre2faToken || !submittedCode) {
      return res.status(400).json({ status: 'error', message: 'pre2faToken and code are required' });
    }

    let payload;
    try {
      payload = verifyPre2FAToken(pre2faToken);
    } catch {
      return res.status(401).json({ status: 'error', message: 'Pre-2FA token expired or invalid' });
    }

    const db = getDb();
    const userDocRef = db.collection('users').doc(payload.username);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const userData = userDoc.data() as UserDocument;
    if (!userData.isTwoFactorEnabled || !userData.twoFactorSecret) {
      return res.status(400).json({ status: 'error', message: '2FA is not enabled for this user' });
    }

    const rawSecret = decrypt(userData.twoFactorSecret);
    const isValid = verifyOtpCode(submittedCode, rawSecret, userData);

    if (!isValid) {
      return res.status(401).json({ status: 'error', message: 'Invalid 2FA code' });
    }

    // Consume single-use emailed code if present
    if (userData.emailTwoFactorCode) {
      await userDocRef.update({
        emailTwoFactorCode: '',
        emailTwoFactorExpires: '',
      });
    }

    // Issue permanent tokens
    const accessToken = generateAccessToken({
      userId: userData.id,
      username: userData.username,
      role: userData.role,
    });

    const { token: refreshToken, hash: refreshHash } = generateRefreshToken(userData.id);

    const sessionDocRef = db.collection('sessions').doc(refreshHash);
    await sessionDocRef.set({
      userId: userData.id,
      username: userData.username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: 'success',
      message: '2FA verification successful. Logged in.',
      accessToken,
      refreshToken,
      user: {
        id: userData.id,
        username: userData.displayName || userData.username,
        email: userData.email,
        role: userData.role,
        isEmailVerified: userData.isEmailVerified,
        isTwoFactorEnabled: true,
      },
    });
  } catch (error: any) {
    console.error('[2FA LOGIN ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed during 2FA login verification' });
  }
}; 