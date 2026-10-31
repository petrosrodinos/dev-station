import {
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { SecretsCryptoService } from './secrets-crypto.service';

const keyB64 = (bytes = 32) => randomBytes(bytes).toString('base64');

const serviceWith = (key: string | undefined) =>
  new SecretsCryptoService({
    get: () => key,
  } as unknown as ConfigService);

describe('SecretsCryptoService', () => {
  const key = keyB64();
  const service = serviceWith(key);
  const AAD = 'org-1:project-1:set-1';

  it('round-trips plaintext, including non-ASCII and empty values', () => {
    for (const text of ['DB_URL=postgres://x', 'πάσσβορντ 🔑', '']) {
      expect(service.decrypt(service.encrypt(text, AAD), AAD)).toBe(text);
    }
  });

  it('does not leak the plaintext into the stored blob', () => {
    const blob = service.encrypt('super-secret-value', AAD);
    expect(blob.startsWith('v1.')).toBe(true);
    expect(blob).not.toContain('super-secret-value');
    expect(Buffer.from(blob, 'utf8').toString('base64')).not.toContain(
      Buffer.from('super-secret-value').toString('base64'),
    );
  });

  it('uses a fresh IV, so equal inputs encrypt differently', () => {
    expect(service.encrypt('same', AAD)).not.toBe(service.encrypt('same', AAD));
  });

  it('rejects a tampered ciphertext', () => {
    const [v, iv, tag, ct] = service.encrypt('value', AAD).split('.');
    const flipped = Buffer.from(ct, 'base64url');
    flipped[0] ^= 0xff;
    const tampered = [v, iv, tag, flipped.toString('base64url')].join('.');
    expect(() => service.decrypt(tampered, AAD)).toThrow(
      InternalServerErrorException,
    );
  });

  it('rejects a blob moved to a different row (AAD mismatch)', () => {
    const blob = service.encrypt('value', AAD);
    expect(() => service.decrypt(blob, 'org-1:project-1:set-2')).toThrow(
      InternalServerErrorException,
    );
  });

  it('rejects a blob encrypted with another key', () => {
    const blob = service.encrypt('value', AAD);
    expect(() => serviceWith(keyB64()).decrypt(blob, AAD)).toThrow(
      InternalServerErrorException,
    );
  });

  it('rejects malformed blobs', () => {
    expect(() => service.decrypt('not-a-blob', AAD)).toThrow(
      InternalServerErrorException,
    );
    expect(() => service.decrypt('v9.a.b.c', AAD)).toThrow(
      InternalServerErrorException,
    );
  });

  it.each([undefined, '', keyB64(16), keyB64(33)])(
    'refuses to work without a valid 32-byte key (%#)',
    (bad) => {
      const unconfigured = serviceWith(bad);
      expect(() => unconfigured.encrypt('value', AAD)).toThrow(
        ServiceUnavailableException,
      );
      expect(() => unconfigured.decrypt('v1.a.b.c', AAD)).toThrow(
        ServiceUnavailableException,
      );
    },
  );
});
