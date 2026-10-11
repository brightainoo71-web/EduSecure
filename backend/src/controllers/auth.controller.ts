import { Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../config/firebase.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { UserDocument } from '../types/user.js';
import {
  generateAccessToken,
  generateRefreshToken,
  generatePre2FAToken,
} from '../utils/token.js';
import { sendVerificationEmail, sendTotpEmail } from '../services/email.service.js';

export const register = async (req: Request, res: Response) => {
  try {
    const validationResult = registerSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { username, password, role, email, adminSecretKey } = validationResult.data;

    if (role === 'ADMIN') {
      const expectedAdminKey = process.env.ADMIN_REGISTRATION_KEY || 'EDU-ADMIN-2026';
      if (!adminSecretKey || adminSecretKey.trim() !== expectedAdminKey) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden: Valid Admin Authorization Key is required for Administrator registration.',
        });
      }
    }

    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email.toLowerCase();
    const db = getDb();

    // Check if username is taken
    const userDocRef = db.collection('users').doc(normalizedUsername);
    const existingUser = await userDocRef.get();

    if (existingUser.exists) {
      return res.status(409).json({
        status: 'error',
        message: 'Username is already taken',
      });
    }

    // Check if email is already registered
    const existingEmailSnap = await db.collection('users').where('email', '==', normalizedEmail).limit(1).get();
    if (!existingEmailSnap.empty) {
      return res.status(409).json({
        status: 'error',
        message: 'Email is already registered. Please sign in or use another email.',
      });
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    const userId = crypto.randomUUID();

    // 6-digit numeric verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const newUser: UserDocument = {
      id: userId,
      username: normalizedUsername,
      email: normalizedEmail,
      isEmailVerified: false,
      emailVerificationToken: verificationCode,
      emailVerificationTokenExpires: verificationExpires,
      displayName: username,
      passwordHash,
      role: role || 'STUDENT',
      isActive: true,
      isTwoFactorEnabled: false,
      createdAt: now,
      updatedAt: now,
    };

    await userDocRef.set(newUser);

    // Send verification email to the user's Gmail/Inbox
    await sendVerificationEmail(normalizedEmail, username, verificationCode);

    return res.status(201).json({
      status: 'success',
      requiresEmailVerification: true,
      message: `Account created successfully. A 6-digit verification code was sent to ${normalizedEmail}.`,
      user: {
        id: newUser.id,
        username: newUser.displayName,
        email: newUser.email,
        role: newUser.role,
        isEmailVerified: newUser.isEmailVerified,
        isTwoFactorEnabled: newUser.isTwoFactorEnabled,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error: any) {
    console.error('[REGISTRATION ERROR]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration',
    });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { username, code } = req.body;
    if (!username || !code) {
      return res.status(400).json({ status: 'error', message: 'Username and verification code are required' });
    }

    const normalizedUsername = username.toLowerCase();
    const db = getDb();
    const userDocRef = db.collection('users').doc(normalizedUsername);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'User not found' });
    }

    const userData = userDoc.data() as UserDocument;

    if (userData.isEmailVerified) {
      return res.status(200).json({ status: 'success', message: 'Email is already verified. You can log in.' });
    }

    if (userData.emailVerificationToken !== code.trim()) {
      return res.status(400).json({ status: 'error', message: 'Invalid verification code' });
    }

    if (userData.emailVerificationTokenExpires && new Date(userData.emailVerificationTokenExpires) < new Date()) {
      return res.status(400).json({ status: 'error', message: 'Verification code has expired. Request a new code.' });
    }

    // Mark email as verified
    await userDocRef.update({
      isEmailVerified: true,
      emailVerificationToken: null,
      emailVerificationTokenExpires: null,
      updatedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      status: 'success',
      message: 'Email successfully verified! You may now sign in.',
    });
  } catch (error: any) {
    console.error('[EMAIL VERIFICATION ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to verify email' });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json({ status: 'error', message: 'Username or email is required' });
    }

    const query = identifier.toLowerCase().trim();
    const db = getDb();
    let userDoc = await db.collection('users').doc(query).get();

    if (!userDoc.exists) {
      const emailQuery = await db.collection('users').where('email', '==', query).limit(1).get();
      if (!emailQuery.empty) userDoc = emailQuery.docs[0];
    }

    if (!userDoc.exists) {
      return res.status(404).json({ status: 'error', message: 'Account not found' });
    }

    const userData = userDoc.data() as UserDocument;
    if (!userData.email) {
      return res.status(400).json({ status: 'error', message: 'No email associated with this account' });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await userDoc.ref.update({
      emailVerificationToken: verificationCode,
      emailVerificationTokenExpires: verificationExpires,
      updatedAt: new Date().toISOString(),
    });

    await sendVerificationEmail(userData.email, userData.username, verificationCode);

    return res.status(200).json({
      status: 'success',
      message: `A new verification code was sent to ${userData.email}.`,
    });
  } catch (error: any) {
    console.error('[RESEND VERIFICATION ERROR]', error);
    return res.status(500).json({ status: 'error', message: 'Failed to resend code' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        status: 'error',
        errors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { identifier, username, password } = validationResult.data;
    const loginQuery = (identifier || username || '').toLowerCase().trim();
    const db = getDb();

    // Query either by username (document id) or by email field
    let userDocRef = db.collection('users').doc(loginQuery);
    let userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      const emailQuerySnapshot = await db.collection('users').where('email', '==', loginQuery).limit(1).get();
      if (!emailQuerySnapshot.empty) {
        userDoc = emailQuerySnapshot.docs[0];
        userDocRef = userDoc.ref;
      }
    }

    // Constant-time dummy verification to mitigate user enumeration timing attacks
    if (!userDoc.exists) {
      await verifyPassword('dummy-password', '$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHQ$dummyhash');
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username, email, or password',
      });
    }

    const userData = userDoc.data() as UserDocument;

    if (!userData.isActive) {
      return res.status(403).json({
        status: 'error',
        message: 'Account is suspended. Contact your School Administrator.',
      });
    }

    // Email verification requirement
    if (userData.email && userData.isEmailVerified === false) {
      return res.status(403).json({
        status: 'email_unverified',
        message: 'Please verify your email before logging in. Enter the code sent to your email.',
        username: userData.username,
        email: userData.email,
      });
    }

    const isPasswordValid = await verifyPassword(password, userData.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username, email, or password',
      });
    }

    // Two-factor authentication check
    if (userData.isTwoFactorEnabled) {
      const pre2faToken = generatePre2FAToken({
        userId: userData.id,
        username: userData.username,
        isPre2FA: true,
      });

      return res.status(200).json({
        status: '2fa_required',
        message: 'Two-factor authentication required',
        pre2faToken,
        email: userData.email || null,
        username: userData.username,
      });
    }

    // Direct login token issuance
    const accessToken = generateAccessToken({
      userId: userData.id,
      username: userData.username,
      role: userData.role,
    });

    const { token: refreshToken, hash: refreshHash } = generateRefreshToken(userData.id);

    // Persist session document in Firestore
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
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: userData.id,
        username: userData.displayName || userData.username,
        email: userData.email,
        role: userData.role,
        isEmailVerified: userData.isEmailVerified,
        isTwoFactorEnabled: userData.isTwoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error('[LOGIN ERROR]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during login',
    });
  }
};

export const refreshSession = async (req: Request, res: Response) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token is required',
      });
    }

    const refreshHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const db = getDb();
    const sessionDocRef = db.collection('sessions').doc(refreshHash);
    const sessionDoc = await sessionDocRef.get();

    // Token reuse detection: if hash doesn't exist, it is invalid or already consumed
    if (!sessionDoc.exists) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired session',
      });
    }

    const sessionData = sessionDoc.data()!;
    if (new Date(sessionData.expiresAt) < new Date()) {
      await sessionDocRef.delete();
      return res.status(401).json({
        status: 'error',
        message: 'Session has expired',
      });
    }

    const userDocRef = db.collection('users').doc(sessionData.username);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists || !userDoc.data()?.isActive) {
      await sessionDocRef.delete();
      return res.status(403).json({
        status: 'error',
        message: 'User account is inactive or deleted',
      });
    }

    const userData = userDoc.data() as UserDocument;

    // 1. Delete old session document so the old token cannot be reused
    await sessionDocRef.delete();

    // 2. Generate brand new access token
    const newAccessToken = generateAccessToken({
      userId: userData.id,
      username: userData.username,
      role: userData.role,
    });

    // 3. Rotate refresh token and persist new session in Firestore
    const { token: newRefreshToken, hash: newRefreshHash } = generateRefreshToken(userData.id);

    const newSessionDocRef = db.collection('sessions').doc(newRefreshHash);
    await newSessionDocRef.set({
      userId: userData.id,
      username: userData.username,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // 4. Update the HTTP-only cookie
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      status: 'success',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: userData.id,
        username: userData.displayName || userData.username,
        email: userData.email,
        role: userData.role,
        isEmailVerified: userData.isEmailVerified,
        isTwoFactorEnabled: userData.isTwoFactorEnabled,
      },
    });
  } catch (error: any) {
    console.error('[REFRESH SESSION ERROR]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during session refresh',
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (rawRefreshToken) {
      const refreshHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const db = getDb();
      await db.collection('sessions').doc(refreshHash).delete();
    }

    res.clearCookie('refreshToken');

    return res.status(200).json({
      status: 'success',
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('[LOGOUT ERROR]', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error during logout',
    });
  }
}; 