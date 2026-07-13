import { Injectable } from "@nestjs/common";
import { createHash, createHmac } from "crypto";

export interface UploadTarget {
  /** Where the client should PUT the file. */
  uploadUrl: string;
  /** Public URL after upload. */
  publicUrl: string;
  storageKey: string;
}

/**
 * Storage abstraction: S3 (presigned PUT, SigV4 computed locally so no SDK
 * dependency) or Supabase Storage (signed upload endpoint).
 */
@Injectable()
export class StorageService {
  private readonly driver = process.env.STORAGE_DRIVER ?? "s3";

  async createUploadTarget(organizationId: string, filename: string, contentType: string): Promise<UploadTarget> {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `${organizationId}/${Date.now()}-${safe}`;
    return this.driver === "supabase"
      ? this.supabaseTarget(storageKey)
      : this.s3Target(storageKey, contentType);
  }

  private supabaseTarget(storageKey: string): UploadTarget {
    const base = process.env.SUPABASE_URL;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "media";
    return {
      // Client uploads with the anon key + user JWT via supabase-js; this is
      // the REST path it will hit.
      uploadUrl: `${base}/storage/v1/object/${bucket}/${storageKey}`,
      publicUrl: `${base}/storage/v1/object/public/${bucket}/${storageKey}`,
      storageKey,
    };
  }

  private s3Target(storageKey: string, contentType: string): UploadTarget {
    const bucket = process.env.S3_BUCKET!;
    const region = process.env.S3_REGION ?? "us-east-1";
    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const uploadUrl = this.presignPut(host, storageKey, region, contentType);
    return { uploadUrl, publicUrl: `https://${host}/${storageKey}`, storageKey };
  }

  /** Minimal SigV4 presigner for PUT objects (15 min expiry). */
  private presignPut(host: string, key: string, region: string, contentType: string): string {
    const accessKey = process.env.S3_ACCESS_KEY_ID!;
    const secretKey = process.env.S3_SECRET_ACCESS_KEY!;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const scope = `${dateStamp}/${region}/s3/aws4_request`;

    const params = new URLSearchParams({
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Credential": `${accessKey}/${scope}`,
      "X-Amz-Date": amzDate,
      "X-Amz-Expires": "900",
      "X-Amz-SignedHeaders": "content-type;host",
    });
    params.sort();

    const canonical = [
      "PUT",
      `/${key}`,
      params.toString(),
      `content-type:${contentType}\nhost:${host}\n`,
      "content-type;host",
      "UNSIGNED-PAYLOAD",
    ].join("\n");
    const toSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      scope,
      createHash("sha256").update(canonical).digest("hex"),
    ].join("\n");

    let signingKey: Buffer = createHmac("sha256", `AWS4${secretKey}`).update(dateStamp).digest();
    for (const part of [region, "s3", "aws4_request"]) {
      signingKey = createHmac("sha256", signingKey).update(part).digest();
    }
    const signature = createHmac("sha256", signingKey).update(toSign).digest("hex");
    return `https://${host}/${key}?${params.toString()}&X-Amz-Signature=${signature}`;
  }
}
