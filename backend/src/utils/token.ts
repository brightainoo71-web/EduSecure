import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '../types/user.js';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error('[SECURITY FATAL] JWT secrets are missing in environment variables.');
}

export interface AccessTokenPayload {
  userId: string;
  username: string;
  role: UserRole;
}

export interface Pre2FAPayload {
  userId: string;
  username: string;
  isPre2FA: true;
}

export const generateAccessToken = (payload: AccessTokenPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (userId: string): { token: string; hash: string } => {
  const token = crypto.randomBytes(40).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
};

export const generatePre2FAToken = (payload: Pre2FAPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '5m' });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
};

export const verifyPre2FAToken = (token: string): Pre2FAPayload => {
  return jwt.verify(token, ACCESS_SECRET) as Pre2FAPayload;
}; 