import argon2 from 'argon2';
import crypto from 'crypto';

const PEPPER = process.env.PASSWORD_PEPPER;

if (!PEPPER) {
  throw new Error('[SECURITY FATAL] PASSWORD_PEPPER is missing in environment variables.');
}

const pepperPassword = (password: string): string => {
  return crypto.createHmac('sha256', PEPPER).update(password).digest('hex');
};

export const hashPassword = async (password: string): Promise<string> => {
  const peppered = pepperPassword(password);
  return argon2.hash(peppered, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64 MB
    timeCost: 3,         // 3 iterations
    parallelism: 1,
  });
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const peppered = pepperPassword(password);
  return argon2.verify(hash, peppered);
}; 