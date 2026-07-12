import { Injectable } from "@nestjs/common";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

/**
 * AES-256-GCM at-rest encryption for OAuth tokens / TOTP secrets.
 * Key is derived from JWT_SECRET; rotate by re-encrypting on read-miss.
 */
@Injectable()
export class CryptoService {
  private readonly key = createHash("sha256")
    .update(process.env.JWT_SECRET ?? "dev-secret")
    .digest();

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), enc]
      .map((b) => b.toString("base64"))
      .join(".");
  }

  decrypt(payload: string): string {
    const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  }

  sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }
}
