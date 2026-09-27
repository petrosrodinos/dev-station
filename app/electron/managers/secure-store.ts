import { app, safeStorage } from "electron";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../utils/logger";

// Credentials (the API session token) are encrypted with the OS keychain via safeStorage (Spec §24).
// Keys are namespaced; the renderer can only reach the allow-listed keys below.

export const SECURE_KEYS = ["auth"] as const;
export type SecureKey = (typeof SECURE_KEYS)[number];

class SecureStore {
  private get dir() {
    return path.join(app.getPath("userData"), "secure");
  }

  private file(key: SecureKey) {
    return path.join(this.dir, `${key}.bin`);
  }

  get(key: SecureKey): string | null {
    try {
      const buf = fs.readFileSync(this.file(key));
      if (!safeStorage.isEncryptionAvailable()) return null;
      return safeStorage.decryptString(buf);
    } catch {
      return null;
    }
  }

  set(key: SecureKey, value: string) {
    if (!safeStorage.isEncryptionAvailable()) {
      logger.warn("safeStorage unavailable — refusing to persist credentials in plain text");
      return;
    }
    fs.mkdirSync(this.dir, { recursive: true });
    fs.writeFileSync(this.file(key), safeStorage.encryptString(value), { mode: 0o600 });
  }

  remove(key: SecureKey) {
    try {
      fs.rmSync(this.file(key), { force: true });
    } catch {
      /* already gone */
    }
  }
}

export const secureStore = new SecureStore();
