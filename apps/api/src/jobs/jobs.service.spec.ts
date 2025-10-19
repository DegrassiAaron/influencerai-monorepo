import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { JobSeriesQuerySchema } from './dto';
import { AppConfig, validateEnv } from '../config/env.validation';

function createConfigService(overrides: Partial<AppConfig> = {}): ConfigService<AppConfig, true> {
  const base = validateEnv({
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    OPENROUTER_API_KEY: 'sk-test',
  });
  const values: AppConfig = { ...base, ...overrides };
  return {
    get: jest.fn((key: keyof AppConfig) => values[key]),
  } as unknown as ConfigService<AppConfig, true>;
}

describe('JobsService', () => {
  let prismaMock: { job: { create: jest.Mock }; $queryRawUnsafe: jest.Mock };
  let service: JobsService;
  let contentQueueMock: Pick<Queue, 'add' | 'getJobCounts'>;
  let imageQueueMock: Pick<Queue, 'add' | 'getJobCounts'>;
  let loraQueueMock: Pick<Queue, 'add' | 'getJobCounts'>;
  let videoQueueMock: Pick<Queue, 'add' | 'getJobCounts'>;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock = {
      job: { create: jest.fn().mockResolvedValue({ id: 'j1', type: 'content-generation' }) },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    } as any;

    const createQueueMock = () =>
      ({
        add: jest.fn().mockResolvedValue(null),
        getJobCounts: jest.fn().mockResolvedValue({ active: 0, waiting: 0, failed: 0 }),
      }) as unknown as Pick<Queue, 'add' | 'getJobCounts'>;

    contentQueueMock = createQueueMock();
    imageQueueMock = createQueueMock();
    loraQueueMock = createQueueMock();
    videoQueueMock = createQueueMock();

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: 'BullQueue_content-generation', useValue: contentQueueMock },
        { provide: 'BullQueue_image-generation', useValue: imageQueueMock },
        { provide: 'BullQueue_lora-training', useValue: loraQueueMock },
        { provide: 'BullQueue_video-generation', useValue: videoQueueMock },
        { provide: ConfigService, useValue: createConfigService() },
      ],
    }).compile();

    service = moduleRef.get(JobsService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates job and enqueues', async () => {
    const job = await service.createJob({ type: 'content-generation', payload: { foo: 'bar' } });

    expect(job.id).toBe('j1');
    expect(contentQueueMock.add).toHaveBeenCalledWith(
      'content-generation',
      expect.objectContaining({ jobId: 'j1', payload: { foo: 'bar' } }),
      expect.objectContaining({
        attempts: 3,
        backoff: expect.objectContaining({ delay: 5000 }),
      })
    );
  });

  it('routes image-generation jobs to the image queue', async () => {
    await service.createJob({ type: 'image-generation', payload: { prompt: 'test', checkpoint: 'mock.ckpt' } });

    expect(imageQueueMock.add).toHaveBeenCalledWith(
      'image-generation',
      expect.objectContaining({ payload: { prompt: 'test', checkpoint: 'mock.ckpt' } }),
      expect.any(Object)
    );
    expect(contentQueueMock.add).not.toHaveBeenCalledWith(
      'image-generation',
      expect.anything(),
      expect.anything()
    );
  });

  it('aggregates job results according to window', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2024-05-15T12:34:56.000Z'));

    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { bucket: new Date('2024-05-15T10:00:00.000Z'), success: 2n, failed: 1n },
      { bucket: new Date('2024-05-15T12:00:00.000Z'), success: 1n, failed: 0n },
    ]);

    const result = await service.getJobSeries({ window: '3h' });

    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(result).toEqual([
      { t: '2024-05-15T10:00:00.000Z', success: 2, failed: 1 },
      { t: '2024-05-15T11:00:00.000Z', success: 0, failed: 0 },
      { t: '2024-05-15T12:00:00.000Z', success: 1, failed: 0 },
    ]);
  });

  it('rejects invalid window format', async () => {
    await expect(service.getJobSeries({ window: 'abc' as any })).rejects.toThrow(
      'Invalid window format'
    );
  });
});

describe('JobSeriesQuerySchema', () => {
  it('applies default window when omitted', () => {
    expect(JobSeriesQuerySchema.parse({})).toEqual({ window: '24h' });
  });

  it('flags invalid window values', () => {
    const result = JobSeriesQuerySchema.safeParse({ window: '5x' });
    expect(result.success).toBe(false);
  });
});
