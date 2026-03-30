/**
 * AES-256-GCM field-level encryption for PII stored in Supabase.
 *
 * SETUP: Set ENCRYPTION_KEY in your environment as a 64-char hex string.
 *   Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * SECURITY MODEL:
 *   - The encrypted ciphertext is safe to store in any TEXT column.
 *   - Without the ENCRYPTION_KEY, raw DB access yields no usable PII.
 *   - Each call to encryptField() produces a unique ciphertext (random 12-byte IV).
 *   - GCM authentication tag prevents undetected tampering.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be a 64-char hex string. Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    // Dev-only fallback — zero key. NEVER deploy without a real key.
    console.warn('[strength-crypto] ⚠️  ENCRYPTION_KEY not set — using zero-key dev fallback. PII is NOT protected.');
    return Buffer.alloc(32, 0);
  }
  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a base64url-encoded string safe for TEXT column storage.
 * Format: IV(12 bytes) || AuthTag(16 bytes) || Ciphertext
 */
export function encryptField(plaintext: string): string {
  const key = getKey();
  const iv  = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc  = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

/**
 * Decrypt a value previously produced by encryptField().
 * Returns null for missing, empty, or corrupt input — never throws to caller.
 */
export function decryptField(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  try {
    const key  = getKey();
    const data = Buffer.from(ciphertext, 'base64url');
    const iv   = data.subarray(0, 12);
    const tag  = data.subarray(12, 28);
    const enc  = data.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  } catch {
    return null; // wrong key, tampered data, or pre-encryption legacy value
  }
}
