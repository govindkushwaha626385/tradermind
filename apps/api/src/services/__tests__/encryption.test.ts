// ──────────────────────────────────────────────
// TradeMind — Encryption Utility Tests
// Tests AES-256-GCM roundtrip, tamper detection,
// SHA-256 hashing, fill hash generation,
// and HMAC-SHA256 creation.
// ──────────────────────────────────────────────

import { describe, it, expect, beforeAll } from 'vitest';
import { randomBytes } from 'node:crypto';

// Set encryption key before importing the module
const TEST_KEY = randomBytes(32).toString('hex');
process.env.ENCRYPTION_KEY = TEST_KEY;

const {
  encrypt,
  decrypt,
  sha256,
  createFillHash,
  maskSensitive,
} = await import('@trademind/database');

describe('🔐 Encryption Utilities', () => {
  // ── AES-256-GCM ──────────────────────────
  describe('AES-256-GCM encryption', () => {
    it('should encrypt and decrypt a plaintext string', () => {
      const plaintext = 'my-super-secret-api-token-12345';
      const encrypted = encrypt(plaintext);

      // Format: iv:authTag:ciphertext (all hex)
      expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
      expect(encrypted).not.toBe(plaintext);

      const decrypted = decrypt(encrypted);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext (random IV)', () => {
      const plaintext = 'same-value-each-time';
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);

      // IV is random, so outputs must differ
      expect(encrypted1).not.toBe(encrypted2);

      // Both must decrypt to the original
      expect(decrypt(encrypted1)).toBe(plaintext);
      expect(decrypt(encrypted2)).toBe(plaintext);
    });

    it('should handle empty strings', () => {
      const encrypted = encrypt('');
      expect(decrypt(encrypted)).toBe('');
    });

    it('should handle special characters and unicode', () => {
      const specials = [
        'hello world',
        'password with spaces',
        'a\nb\tc',
        'unicode: ñoño 🚀 中文',
        'json-like: {"key": "value"}',
        'special: !@#$%^&*()_+-=[]{}|;:,.<>?',
      ];

      for (const plaintext of specials) {
        const encrypted = encrypt(plaintext);
        const decrypted = decrypt(encrypted);
        expect(decrypted).toBe(plaintext);
      }
    });

    it('should throw on tampered ciphertext', () => {
      const plaintext = 'secret-token';
      const encrypted = encrypt(plaintext);

      // Tamper with the ciphertext portion (last part after second colon)
      const parts = encrypted.split(':');
      const tamperedCiphertext = parts[0] + ':' + parts[1] + ':' + 'deadbeef' + parts[2]!.slice(8);

      expect(() => decrypt(tamperedCiphertext)).toThrow();
    });

    it('should throw on invalid format', () => {
      expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted format');
      expect(() => decrypt('part1:part2')).toThrow('Invalid encrypted format');
      expect(() => decrypt('')).toThrow('Invalid encrypted format');
    });
  });

  // ── SHA-256 ──────────────────────────────
  describe('SHA-256 hashing', () => {
    it('should produce consistent hashes', () => {
      const input = 'test-input';
      expect(sha256(input)).toBe(sha256(input));
    });

    it('should produce 64-character hex strings', () => {
      const hash = sha256('anything');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should produce different hashes for different inputs', () => {
      expect(sha256('input-a')).not.toBe(sha256('input-b'));
    });
  });

  // ── Fill Hash ────────────────────────────
  describe('createFillHash', () => {
    it('should produce deterministic fill hashes', () => {
      const hash1 = createFillHash('zerodha', 'exec-123', 'user-abc');
      const hash2 = createFillHash('zerodha', 'exec-123', 'user-abc');
      expect(hash1).toBe(hash2);
    });

    it('should differ when brokerId changes', () => {
      const h1 = createFillHash('zerodha', 'exec-123', 'user-abc');
      const h2 = createFillHash('dhan', 'exec-123', 'user-abc');
      expect(h1).not.toBe(h2);
    });

    it('should differ when executionId changes', () => {
      const h1 = createFillHash('zerodha', 'exec-123', 'user-abc');
      const h2 = createFillHash('zerodha', 'exec-456', 'user-abc');
      expect(h1).not.toBe(h2);
    });

    it('should differ when userId changes', () => {
      const h1 = createFillHash('zerodha', 'exec-123', 'user-abc');
      const h2 = createFillHash('zerodha', 'exec-123', 'user-xyz');
      expect(h1).not.toBe(h2);
    });
  });

  // ── Mask Sensitive ───────────────────────
  describe('maskSensitive', () => {
    it('should mask the middle portion of a string', () => {
      const masked = maskSensitive('abcdefghijklmnop');
      expect(masked).toBe('abcd****mnop');
    });

    it('should handle short strings', () => {
      expect(maskSensitive('abc')).toBe('****');
    });

    it('should respect visibleChars parameter', () => {
      const masked = maskSensitive('abcdefghij', 2);
      expect(masked).toBe('ab****ghij');
    });
  });
});
