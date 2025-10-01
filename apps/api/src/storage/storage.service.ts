import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, HeadBucketCommand, CreateBucketCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

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

  constructor(private readonly config: ConfigService) {
    const endpoint = this.config.get<string>('S3_ENDPOINT') || 'http://localhost:9000';
    const region = this.config.get<string>('AWS_REGION') || 'us-east-1';
    const accessKeyId = this.config.get<string>('S3_KEY') || 'minio';
    const secretAccessKey = this.config.get<string>('S3_SECRET') || 'minio12345';
    this.bucket = this.config.get<string>('S3_BUCKET') || 'assets';

    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async ensureBucket(): Promise<void> {
    // Allow tests or callers to skip S3 connectivity checks entirely
    if (process.env.SKIP_S3_INIT === 'true' || process.env.SKIP_S3_INIT === '1') return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err: any) {
      // Create if missing
      if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound' || err?.Code === 'NoSuchBucket') {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        return;
      }
      // Ignore Forbidden/200 if user lacks permissions but bucket exists
      if (err?.$metadata?.httpStatusCode === 403) return;
      // In test environments, don't fail startup on missing/invalid S3
      if (process.env.NODE_ENV === 'test') return;
      throw err;
    }
  }

  async putTextObject(key: string, content: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: Buffer.from(content, 'utf8'), ContentType: 'text/plain' }),
    );
  }

  async getTextObject(key: string): Promise<string> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!res.Body || !(res.Body instanceof Readable)) return '';
    return streamToString(res.Body as Readable);
  }
}
