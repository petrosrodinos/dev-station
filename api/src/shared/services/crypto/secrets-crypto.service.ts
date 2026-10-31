import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { ErrorCodes } from '@/shared/config/error-codes';

const VERSION = 'v1';
const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
const IV_BYTES = 12;

/**
 * AES-256-GCM encryption for values that must be stored recoverably (shared env values).
 * Blob format: `v1.<iv>.<tag>.<ciphertext>` (base64url). `aad` binds a blob to its row, so
 * copying it elsewhere makes decryption fail.
 */
@Injectable()
export class SecretsCryptoService {
  constructor(private readonly config: ConfigService) {}

  encrypt(plaintext: string, aad: string): string {
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.getKey(), iv);
    cipher.setAAD(Buffer.from(aad));
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    return [
      VERSION,
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  decrypt(blob: string, aad: string): string {
    const [version, iv, tag, ciphertext] = blob.split('.');
    if (version !== VERSION || !iv || !tag || ciphertext === undefined) {
      throw new InternalServerErrorException('Unreadable secret payload');
    }
    try {
      const decipher = createDecipheriv(
        ALGORITHM,
        this.getKey(),
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAAD(Buffer.from(aad));
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new InternalServerErrorException('Unreadable secret payload');
    }
  }

  private getKey(): Buffer {
    const raw = this.config.get<string>('SECRETS_ENCRYPTION_KEY');
    const key = raw ? Buffer.from(raw, 'base64') : undefined;
    if (!key || key.length !== KEY_BYTES) {
      throw new ServiceUnavailableException({
        message: 'Shared secrets are not configured on this server',
        code: ErrorCodes.Secrets.NOT_CONFIGURED,
      });
    }
    return key;
  }
}
