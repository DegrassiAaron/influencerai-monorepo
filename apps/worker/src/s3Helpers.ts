import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger as defaultLogger } from './logger';

export type LoggerLike = Pick<typeof defaultLogger, 'info' | 'warn' | 'error'>;

export type S3ClientInfo = { client: S3Client; bucket: string };

export function getClient(logger: LoggerLike = defaultLogger): S3ClientInfo | null {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_KEY || 'minio';
  const secretAccessKey = process.env.S3_SECRET || 'minio12345';
  const bucket = process.env.S3_BUCKET || 'assets';
  try {
    const client = new S3Client({
      region,
      endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
    return { client, bucket };
  } catch (e) {
    logger.warn({ err: e }, 'Unable to initialize S3 client');
    return null;
  }
}

export async function putTextObject(
  client: S3Client,
  bucket: string,
  key: string,
  content: string
) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(content, 'utf8'),
      ContentType: 'text/plain',
    })
  );
}

export async function putBinaryObject(
  client: S3Client,
  bucket: string,
  key: string,
  body: NodeJS.ReadableStream | Uint8Array | Buffer,
  contentType = 'application/octet-stream'
) {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType })
  );
}

export async function getSignedGetUrl(
  client: S3Client,
  bucket: string,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
}

export type S3Helpers = {
  getClient: typeof getClient;
  putTextObject: typeof putTextObject;
  putBinaryObject: typeof putBinaryObject;
  getSignedGetUrl: typeof getSignedGetUrl;
};
