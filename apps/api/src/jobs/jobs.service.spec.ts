import { Test } from '@nestjs/testing';
import { Queue } from 'bullmq';
import { JobsService } from './jobs.service';
import { PrismaService } from '../prisma/prisma.service';
import { JobSeriesQuerySchema } from './dto';

describe('JobsService', () => {
  const queueMock = { add: jest.fn().mockResolvedValue(null) } as Pick<Queue, 'add'>;
  let prismaMock: { job: { create: jest.Mock }; $queryRawUnsafe: jest.Mock };
  let service: JobsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    prismaMock = {
      job: { create: jest.fn().mockResolvedValue({ id: 'j1', type: 'content-generation' }) },
      $queryRawUnsafe: jest.fn().mockResolvedValue([]),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: 'BullQueue_content-generation', useValue: queueMock },
        { provide: 'BullQueue_lora-training', useValue: queueMock },
        { provide: 'BullQueue_video-generation', useValue: queueMock },
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
    expect(queueMock.add).toHaveBeenCalledWith(
      'content-generation',
      expect.objectContaining({ jobId: 'j1', payload: { foo: 'bar' } }),
      expect.any(Object),
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
    await expect(service.getJobSeries({ window: 'abc' as any })).rejects.toThrow('Invalid window format');
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
