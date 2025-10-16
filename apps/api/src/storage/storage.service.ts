import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'node:stream';
import { AppConfig } from '../config/env.validation';

function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

@Injectable()
export class StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService<AppConfig, true>) {
    const endpoint = this.config.get('S3_ENDPOINT', { infer: true });
    const region = this.config.get('AWS_REGION', { infer: true });
    const accessKeyId = this.config.get('S3_KEY', { infer: true });
    const secretAccessKey = this.config.get('S3_SECRET', { infer: true });
    this.bucket = this.config.get('S3_BUCKET', { infer: true });

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  getBucketName(): string {
    return this.bucket;
  }

  async ensureBucket(): Promise<void> {
    // Allow tests or callers to skip S3 connectivity checks entirely
    if (this.config.get('SKIP_S3_INIT', { infer: true })) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error: unknown) {
      const err =
        typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
      // Create if missing
      const metadata = err.$metadata;
      const status =
        typeof metadata === 'object' && metadata !== null
          ? Number((metadata as { httpStatusCode?: number }).httpStatusCode)
          : undefined;
      const name = typeof err.name === 'string' ? (err.name as string) : undefined;
      const code = typeof err.Code === 'string' ? (err.Code as string) : undefined;
      if (status === 404 || name === 'NotFound' || code === 'NoSuchBucket') {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        return;
      }
      // Ignore Forbidden/200 if user lacks permissions but bucket exists
      if (status === 403) return;
      // In test environments, don't fail startup on missing/invalid S3
      const nodeEnv = this.config.get('NODE_ENV', { infer: true });
      if (nodeEnv === 'test') return;
      const fallbackError = error instanceof Error ? error : new Error(String(error));
      throw fallbackError;
    }
  }

  async putTextObject(key: string, content: string) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: Buffer.from(content, 'utf8'),
        ContentType: 'text/plain',
      })
    );
  }

  async getTextObject(key: string): Promise<string> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!res.Body || !(res.Body instanceof Readable)) return '';
    return streamToString(res.Body as Readable);
  }

  async getPresignedPutUrl(params: {
    key: string;
    contentType?: string;
    expiresInSeconds?: number;
  }): Promise<string> {
    const { key, contentType, expiresInSeconds } = params;
    const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds ?? 900 });
    return url;
  }
}
