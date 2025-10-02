import { ConfigService } from '@nestjs/config';
import { StorageService } from '../src/storage/storage.service';

describe('MinIO integration (e2e)', () => {
  const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
  const key = process.env.S3_KEY || 'minio';
  const secret = process.env.S3_SECRET || 'minio12345';
  const bucket = process.env.S3_BUCKET || 'assets';

  let storage: StorageService;
  let skipSuite = false;

  beforeAll(async () => {
    // Provide a minimal ConfigService stub
    const cfg = new ConfigService({
      S3_ENDPOINT: endpoint,
      S3_KEY: key,
      S3_SECRET: secret,
      S3_BUCKET: bucket,
      AWS_REGION: 'us-east-1',
    } as any);

    storage = new StorageService(cfg);
    try {
      await storage.ensureBucket();
      const probeKey = `e2e/minio-probe-${Date.now()}.txt`;
      await storage.putTextObject(probeKey, 'probe');
      await storage.getTextObject(probeKey);
    } catch (err) {
      skipSuite = true;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`MinIO non disponibile; salto la suite MinIO (e2e): ${message}`);
    }
  });

  it('can PUT and GET a text object', async () => {
    if (skipSuite) {
      return;
    }
    const testKey = `e2e/minio-test-${Date.now()}.txt`;
    const content = 'hello-from-e2e';
    await storage.putTextObject(testKey, content);
    const roundtrip = await storage.getTextObject(testKey);
    expect(roundtrip).toBe(content);
  });

  it('generates a presigned PUT URL against the MinIO endpoint', async () => {
    if (skipSuite) {
      return;
    }
    const testKey = `e2e/presign-${Date.now()}.bin`;
    const url = await storage.getPresignedPutUrl({ key: testKey, contentType: 'application/octet-stream' });
    expect(typeof url).toBe('string');
    expect(url).toContain(new URL(endpoint).host);
    // Some S3 providers keep slashes unencoded in path-style URLs
    expect(url).toContain(testKey);
  });
});
