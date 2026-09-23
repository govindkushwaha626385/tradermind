// ──────────────────────────────────────────────
// TradeMind — Encryption & Security Utilities
// AES-256-GCM for token/secret encryption at rest
// ──────────────────────────────────────────────

import { createCipheriv, createDecipheriv, randomBytes, createHash, createHmac as nodeCreateHmac, type Hmac } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

/**
 * Get the encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * Returns: iv:authTag:ciphertext (hex-encoded)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * Input format: iv:authTag:ciphertext (hex-encoded)
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, ciphertext] = parts;
  const iv = Buffer.from(ivHex!, 'hex');
  const authTag = Buffer.from(authTagHex!, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext!, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random SHA-256 hash for deduplication
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Create a fill hash for deduplication
 */
export function createFillHash(brokerId: string, brokerExecutionId: string, userId: string): string {
  return sha256(`${brokerId}_${brokerExecutionId}_${userId}`);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitive(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars) return '****';
  return value.slice(0, visibleChars) + '****' + value.slice(-4);
}

/**
 * Create an HMAC digest for webhook signature verification
 * Uses Node's createHmac for proper HMAC-SHA256 computation
 */
export function createHmac(algorithm: string, secret: string): Hmac {
  return nodeCreateHmac(algorithm, secret);
}
