import crypto from "crypto";
import { env } from "../config/env";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function key(): Buffer {
  return crypto.createHash("sha256").update(env.encryptionKey).digest();
}

export function encryptText(plain: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString("base64");
  return `${VERSION}:${payload}`;
}

export function decryptText(payload: string): string {
  const version = payload.slice(0, payload.indexOf(":"));
  if (version !== VERSION) throw new Error("Unsupported encrypted payload version");
  const buffer = Buffer.from(payload.slice(version.length + 1), "base64");
  if (buffer.length < IV_LENGTH + TAG_LENGTH) throw new Error("Invalid encrypted payload");
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}