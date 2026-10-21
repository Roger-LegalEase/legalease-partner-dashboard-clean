import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Restricted intake values (today: the SSN) are encrypted here, in the
// application, with AES-256-GCM under a server-only key. The database stores
// ciphertext, the key version and a four-digit display hint; ordinary reads,
// queue listings, exports, logs, analytics and messages never see the value.
//
// Key management: LEGAL_AID_RESTRICTED_FIELD_KEY is a base64-encoded 32-byte
// key; LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION names it (default "v1"). A
// rotation adds a new key under a new version and keeps the previous key
// available as LEGAL_AID_RESTRICTED_FIELD_KEY_<PREVIOUS_VERSION> for reads.
// There is no development fallback: without a key the restricted field cannot
// be written, and the intake reports that plainly.

const KEY_ENV = "LEGAL_AID_RESTRICTED_FIELD_KEY";
const KEY_VERSION_ENV = "LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export class RestrictedFieldError extends Error {
  constructor(readonly code: "key_unavailable" | "ciphertext_invalid" | "key_version_unknown", message: string) {
    super(message);
    this.name = "RestrictedFieldError";
  }
}

export function restrictedFieldKeyVersion(env: NodeJS.ProcessEnv = process.env): string {
  return (env[KEY_VERSION_ENV] ?? "v1").trim() || "v1";
}

export function restrictedFieldsConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  try {
    loadKey(restrictedFieldKeyVersion(env), env);
    return true;
  } catch {
    return false;
  }
}

function loadKey(version: string, env: NodeJS.ProcessEnv): Buffer {
  const current = restrictedFieldKeyVersion(env);
  const raw = version === current ? env[KEY_ENV] : env[`${KEY_ENV}_${version.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`];
  if (!raw) {
    throw new RestrictedFieldError(version === current ? "key_unavailable" : "key_version_unknown", `Restricted field key ${version} is not configured.`);
  }
  const key = Buffer.from(raw.trim(), "base64");
  if (key.length !== 32) throw new RestrictedFieldError("key_unavailable", "Restricted field key must decode to 32 bytes.");
  return key;
}

export type EncryptedRestrictedValue = { ciphertext: string; keyVersion: string };

export function encryptRestrictedValue(plaintext: string, env: NodeJS.ProcessEnv = process.env): EncryptedRestrictedValue {
  const keyVersion = restrictedFieldKeyVersion(env);
  const key = loadKey(keyVersion, env);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: Buffer.concat([iv, tag, encrypted]).toString("base64"), keyVersion };
}

export function decryptRestrictedValue(value: EncryptedRestrictedValue, env: NodeJS.ProcessEnv = process.env): string {
  const key = loadKey(value.keyVersion, env);
  const bytes = Buffer.from(value.ciphertext, "base64");
  if (bytes.length < IV_BYTES + TAG_BYTES + 1) throw new RestrictedFieldError("ciphertext_invalid", "Restricted ciphertext is malformed.");
  const iv = bytes.subarray(0, IV_BYTES);
  const tag = bytes.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const encrypted = bytes.subarray(IV_BYTES + TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new RestrictedFieldError("ciphertext_invalid", "Restricted ciphertext could not be authenticated.");
  }
}

/** "•••-••-1234" for display; the hint stored beside the ciphertext is the last four digits only. */
export function maskSsn(lastFour: string | null | undefined): string {
  return lastFour && /^\d{4}$/.test(lastFour) ? `•••-••-${lastFour}` : "•••-••-••••";
}

export function ssnDisplayHint(digits: string): string {
  return digits.slice(-4);
}
