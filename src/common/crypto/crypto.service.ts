import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { TEnv } from '../../config/env';

/** AES-256-GCM encryption for secrets that must be read back (the 2FA TOTP secret). */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService<TEnv, true>) {
    this.key = Buffer.from(config.get<string>('TWO_FACTOR_KEY', { infer: true }), 'base64');
  }

  /** Returns "iv:authTag:ciphertext", each part base64. */
  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), data].map((b) => b.toString('base64')).join(':');
  }

  /** Throws if the value was tampered with or encrypted under a different key. */
  decrypt(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) throw new Error('Malformed encrypted value');
    const [iv, tag, data] = parts.map((p) => Buffer.from(p, 'base64'));
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
}