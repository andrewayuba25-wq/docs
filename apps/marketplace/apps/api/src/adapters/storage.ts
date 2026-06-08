import crypto from 'node:crypto';
import { config } from '../lib/config.js';

export interface StorageAdapter {
  presignPut(key: string, contentType: string, maxBytes: number): Promise<{ url: string; key: string }>;
  publicUrl(key: string): string;
}

class FakeStorage implements StorageAdapter {
  // Dev-mode adapter: returns a deterministic local URL so the mobile app can pretend to upload.
  async presignPut(key: string): Promise<{ url: string; key: string }> {
    return { url: `http://localhost:9000/${config.S3_BUCKET}/${key}`, key };
  }
  publicUrl(key: string): string {
    return `http://localhost:9000/${config.S3_BUCKET}/${key}`;
  }
}

class S3Storage implements StorageAdapter {
  // Minimal S3 v4 signing for PUT presigned URLs without a full SDK dependency.
  async presignPut(key: string, contentType: string): Promise<{ url: string; key: string }> {
    const region = config.S3_REGION;
    const bucket = config.S3_BUCKET;
    const host = config.S3_ENDPOINT
      ? new URL(config.S3_ENDPOINT).host
      : `${bucket}.s3.${region}.amazonaws.com`;
    const date = new Date();
    const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const credential = `${config.S3_ACCESS_KEY}/${dateStamp}/${region}/s3/aws4_request`;

    const params = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': credential,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': '600',
      'X-Amz-SignedHeaders': 'host',
      'Content-Type': contentType,
    });

    const canonicalRequest = [
      'PUT',
      `/${encodeURIComponent(key)}`,
      params.toString(),
      `host:${host}\n`,
      'host',
      'UNSIGNED-PAYLOAD',
    ].join('\n');

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      `${dateStamp}/${region}/s3/aws4_request`,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const kDate = hmac(`AWS4${config.S3_SECRET_KEY}`, dateStamp);
    const kRegion = hmac(kDate, region);
    const kService = hmac(kRegion, 's3');
    const kSigning = hmac(kService, 'aws4_request');
    const signature = hmac(kSigning, stringToSign).toString('hex');

    params.append('X-Amz-Signature', signature);
    const url = `https://${host}/${encodeURIComponent(key)}?${params.toString()}`;
    return { url, key };
  }

  publicUrl(key: string): string {
    if (config.S3_ENDPOINT) return `${config.S3_ENDPOINT}/${config.S3_BUCKET}/${key}`;
    return `https://${config.S3_BUCKET}.s3.${config.S3_REGION}.amazonaws.com/${key}`;
  }
}

function hmac(key: string | Buffer, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value).digest();
}

export const storage: StorageAdapter = config.S3_FAKE ? new FakeStorage() : new S3Storage();
