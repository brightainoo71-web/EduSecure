import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.TWO_FACTOR_ENCRYPTION_KEY;

if (!KEY || Buffer.from(KEY, 'hex').length !== 32) {
  throw new Error('[SECURITY FATAL] TWO_FACTOR_ENCRYPTION_KEY must be a 32-byte hex string (64 characters).');
}

const keyBuffer = Buffer.from(KEY, 'hex');

/**
 * Encrypts sensitive text using AES-256-GCM.
 * Output format: iv:authTag:ciphertext (hex-encoded)
 */
export const encrypt = (plainText: string): string => {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

/**
 * Decrypts AES-256-GCM encrypted payload.
 */
export const decrypt = (cipherPayload: string): string => {
  const [ivHex, authTagHex, encryptedHex] = cipherPayload.split(':');

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error('Invalid cipher payload format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}; 